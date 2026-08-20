"use client";

import React, { useState } from "react";
import {
    getTrafficViolations,
    addTrafficViolation,
    updateTrafficViolation,
    toggleTrafficViolationStatus,
} from "@/app/admin/poso/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ShieldAlert,
    Plus,
    Search,
    Edit2,
    Save,
    FileSpreadsheet,
    CheckCircle2,
    Archive,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";
import { toast } from "sonner";

export interface TrafficViolationItem {
    id: string;
    violationCode: string | null;
    violationName: string;
    firstOffenseFee: number;
    secondOffenseFee: number;
    thirdOffenseFee: number;
    remarks: string | null;
    isActive: boolean;
    createdAt: Date;
}

export default function ViolationsPage({
    initialViolations,
    initialTotalCount = 0,
    initialActiveCount = 0,
    initialInactiveCount = 0,
}: {
    initialViolations: TrafficViolationItem[];
    initialTotalCount?: number;
    initialActiveCount?: number;
    initialInactiveCount?: number;
}) {
    const [violations, setViolations] = useState<TrafficViolationItem[]>(initialViolations);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [activeCount, setActiveCount] = useState(initialActiveCount);
    const [inactiveCount, setInactiveCount] = useState(initialInactiveCount);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const [isPending, setIsPending] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<TrafficViolationItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    React.useEffect(() => {
        setViolations(initialViolations);
        setTotalCount(initialTotalCount);
        setActiveCount(initialActiveCount);
        setInactiveCount(initialInactiveCount);
        setIsPending(false);
    }, [initialViolations, initialTotalCount, initialActiveCount, initialInactiveCount]);

    const fetchViolations = React.useCallback(
        async (
            p: number,
            s: string,
            st: "ALL" | "ACTIVE" | "INACTIVE",
            customLimit?: number
        ) => {
            setIsPending(true);
            try {
                const limitToUse = customLimit !== undefined ? customLimit : pageSize;
                const res = await getTrafficViolations({
                    page: p,
                    limit: limitToUse,
                    search: s,
                    status: st,
                });

                if (res.success && res.violations) {
                    setViolations(res.violations);
                    setTotalCount(res.totalCount || 0);
                    if (res.activeCount !== undefined) setActiveCount(res.activeCount);
                    if (res.inactiveCount !== undefined) setInactiveCount(res.inactiveCount);
                } else if (!res.success) {
                    toast.error(res.error || "Failed to load violations.");
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to load violations.");
            } finally {
                setIsPending(false);
            }
        },
        [pageSize]
    );

    const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        setPage(1);

        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        searchTimerRef.current = setTimeout(() => {
            fetchViolations(1, val, statusFilter, pageSize);
        }, 400);
    };

    const handleStatusFilterChange = (st: "ALL" | "ACTIVE" | "INACTIVE") => {
        setStatusFilter(st);
        setPage(1);
        fetchViolations(1, search, st, pageSize);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchViolations(newPage, search, statusFilter, pageSize);
    };

    const handlePageSizeChange = (newSizeStr: string) => {
        const newSize = parseInt(newSizeStr, 10) || 10;
        setPageSize(newSize);
        setPage(1);
        fetchViolations(1, search, statusFilter, newSize);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
        }, 200);
    };

    const handleAddNew = () => {
        setEditingData(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (item: TrafficViolationItem) => {
        setEditingData(item);
        setIsAddModalOpen(true);
    };

    const handleToggleStatus = async (item: TrafficViolationItem) => {
        const nextState = !item.isActive;
        setTogglingId(item.id);
        try {
            const res = await toggleTrafficViolationStatus(item.id, nextState);
            if (res.success) {
                toast.success(
                    `Ordinance "${item.violationName}" ${nextState ? "activated" : "deactivated/archived"}!`
                );
                setViolations((prev) =>
                    prev.map((v) => (v.id === item.id ? { ...v, isActive: nextState } : v))
                );
                setActiveCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
                setInactiveCount((prev) => (nextState ? Math.max(0, prev - 1) : prev + 1));
            } else {
                toast.error(res.error || "Failed to update ordinance status.");
            }
        } catch {
            toast.error("Failed to toggle ordinance status.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            let res;
            if (editingData) {
                res = await updateTrafficViolation(editingData.id, formData);
            } else {
                res = await addTrafficViolation(formData);
            }

            if (res.success) {
                toast.success(
                    editingData
                        ? "Violation ordinance updated successfully!"
                        : "Violation ordinance added successfully!"
                );
                handleCloseModal();
                fetchViolations(page, search, statusFilter, pageSize);
            } else {
                toast.error(res.error || "Failed to save violation.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <ShieldAlert className="mr-3 w-10 h-10 text-rose-600" />
                        Traffic Violations & Ordinance Masterlist
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Configure POSO traffic violation ordinances and fine structures with state management (Active/Archived).
                    </p>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Total Filtered</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</h3>
                    </div>
                    <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Ordinances</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Archived / Inactive</p>
                        <h3 className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</h3>
                    </div>
                    <div className="p-3 bg-slate-500/10 text-slate-600 rounded-xl">
                        <Archive className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 relative">
                {/* Search & Filter Bar */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040]">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors w-4 h-4" />
                            <Input
                                placeholder="Search violation code, name, remarks..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-rose-500/20 font-medium italic"
                            />
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex items-center bg-slate-100 dark:bg-[#1a1f2e] p-1 rounded-xl border border-slate-200 dark:border-[#2a3040]">
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange("ALL")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${
                                    statusFilter === "ALL"
                                        ? "bg-white dark:bg-[#252b3d] text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange("ACTIVE")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${
                                    statusFilter === "ACTIVE"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-emerald-600"
                                }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange("INACTIVE")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${
                                    statusFilter === "INACTIVE"
                                        ? "bg-slate-700 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                Inactive ({inactiveCount})
                            </button>
                        </div>
                    </div>

                    <Button
                        onClick={handleAddNew}
                        className="h-11 px-6 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg bg-rose-600 hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Violation Ordinance
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                    Code
                                </TableHead>
                                <TableHead className="w-[280px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Violation Title & Ordinance
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-emerald-600">
                                    1st Offense
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-amber-600">
                                    2nd Offense
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-rose-600">
                                    3rd Offense
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Status
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-200 dark:border-[#2a3040] animate-pulse">
                                        <TableCell className="pl-8 py-5">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                                <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : violations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <FileSpreadsheet className="w-12 h-12 mb-3 stroke-[1.5]" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300">
                                                No Traffic Violations Found
                                            </p>
                                            <p className="text-xs mt-1">
                                                Click &quot;Add Violation Ordinance&quot; to populate the POSO masterlist.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                violations.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={`group transition-colors border-b border-slate-200 dark:border-[#2a3040] ${
                                            !item.isActive
                                                ? "bg-slate-50/40 dark:bg-white/[0.02] opacity-75"
                                                : "hover:bg-rose-50/20 dark:hover:bg-rose-950/10"
                                        }`}
                                    >
                                        <TableCell className="pl-8 py-5 font-black text-xs text-rose-600 dark:text-rose-400 italic uppercase">
                                            {item.violationCode || "N/A"}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight">
                                                    {item.violationName}
                                                </span>
                                                {item.remarks && (
                                                    <span className="text-xs text-slate-500 italic line-clamp-1">
                                                        {item.remarks}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center font-black text-sm text-emerald-600 dark:text-emerald-400 italic">
                                            ₱ {item.firstOffenseFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center font-black text-sm text-amber-600 dark:text-amber-400 italic">
                                            ₱ {item.secondOffenseFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center font-black text-sm text-rose-600 dark:text-rose-400 italic">
                                            ₱ {item.thirdOffenseFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={item.isActive}
                                                    disabled={togglingId === item.id}
                                                    onCheckedChange={() => handleToggleStatus(item)}
                                                />
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase italic ${
                                                        item.isActive
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                    }`}
                                                >
                                                    {item.isActive ? "ACTIVE" : "INACTIVE"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                    className="h-9 w-9 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-xs font-bold text-slate-500">
                            Showing {violations.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                            {Math.min(page * pageSize, totalCount)} of {totalCount} ordinances
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Rows per page:</span>
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="w-[85px] h-8 text-xs font-bold bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl">
                                    <SelectValue placeholder="10" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
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
                            disabled={page === 1 || isPending}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-9 px-3 font-bold text-xs rounded-xl"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-black px-3 py-1 bg-slate-100 dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-[#2a3040]">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || isPending}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-9 px-3 font-bold text-xs rounded-xl"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <Dialog
                open={isAddModalOpen}
                onOpenChange={(open) => {
                    if (!open) handleCloseModal();
                    else setIsAddModalOpen(true);
                }}
            >
                <DialogContent showCloseButton={false} className="sm:max-w-3xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                    <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                        {/* Header */}
                        <DialogHeader className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] bg-rose-50/40 dark:bg-rose-950/20 flex flex-row items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {editingData ? "Edit Violation Ordinance" : "Add Violation Ordinance"}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                        Set ordinance code, violation title, and fine schedule.
                                    </DialogDescription>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCloseModal}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 z-50 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogHeader>

                        {/* Form */}
                        <div className="p-8 pb-28 overflow-y-auto custom-scrollbar">
                            <form
                                key={editingData?.id || "new-violation-form"}
                                id="violationForm"
                                onSubmit={handleSubmit}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="violationCode" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                            Violation Code / Section
                                        </Label>
                                        <Input
                                            id="violationCode"
                                            name="violationCode"
                                            defaultValue={editingData?.violationCode || ""}
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                            placeholder="e.g. SEC-01 / NO-HELMET"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="violationName" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                            Violation Title <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="violationName"
                                            name="violationName"
                                            defaultValue={editingData?.violationName || ""}
                                            required
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                            placeholder="e.g. Failure to Wear Protective Helmet"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label htmlFor="firstOffenseFee" className="text-xs font-semibold text-emerald-600 mb-2 block">
                                            1st Offense Fine (₱) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="firstOffenseFee"
                                            name="firstOffenseFee"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editingData ? editingData.firstOffenseFee : ""}
                                            required
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                            placeholder="e.g. 500.00"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="secondOffenseFee" className="text-xs font-semibold text-amber-600 mb-2 block">
                                            2nd Offense Fine (₱) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="secondOffenseFee"
                                            name="secondOffenseFee"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editingData ? editingData.secondOffenseFee : ""}
                                            required
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                            placeholder="e.g. 1000.00"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="thirdOffenseFee" className="text-xs font-semibold text-rose-600 mb-2 block">
                                            3rd Offense Fine (₱) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="thirdOffenseFee"
                                            name="thirdOffenseFee"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editingData ? editingData.thirdOffenseFee : ""}
                                            required
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                            placeholder="e.g. 1500.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Remarks / Additional Description
                                    </Label>
                                    <Input
                                        id="remarks"
                                        name="remarks"
                                        defaultValue={editingData?.remarks || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="Specific guidelines or legal ordinance provisions..."
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 sticky bottom-0 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3 z-50">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseModal}
                                className="h-11 px-6 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="violationForm"
                                disabled={loading}
                                className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span>{editingData ? "Update Ordinance" : "Save Ordinance"}</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
