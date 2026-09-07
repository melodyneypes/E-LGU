"use client";

import React, { useState, useEffect } from "react";
import {
    Plus,
    Search,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    Trash2,
    Edit2,
    MapPin,
    Loader2,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RoadClosureStatus } from "@prisma/client";
import { RoadClosureModal } from "./RoadClosureModal";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { toggleRoadClosureStatusAction, deleteRoadClosureAction } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface RoadClosuresClientProps {
    initialClosures: any[];
    barangaysList: { id: string; name: string }[];
    userManagedBarangay?: string | null;
    isBarangayAdmin?: boolean;
}

// Sleek row skeleton loader
function RoadClosureRowSkeleton() {
    return (
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-lg" />
                    <div className="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded-md" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-md" />
                <div className="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-md" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <div className="h-9 w-24 bg-slate-200 dark:bg-white/10 rounded-xl" />
                <div className="h-9 w-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
                <div className="h-9 w-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
            </div>
        </div>
    );
}

export function RoadClosuresClient({
    initialClosures,
    barangaysList,
    userManagedBarangay,
    isBarangayAdmin,
}: RoadClosuresClientProps) {
    const [closures, setClosures] = useState<any[]>(initialClosures);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClosure, setSelectedClosure] = useState<any | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [isMutating, setIsMutating] = useState(false);
    const [isPageChanging, setIsPageChanging] = useState(false);
    
    // Delete Confirmation Modal State
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: async () => {},
    });
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 400ms search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim().toLowerCase());
            setCurrentPage(1); // Reset to first page on search change
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput]);

    // Reset pagination when status filter changes
    const handleStatusFilterChange = (tab: string) => {
        setStatusFilter(tab);
        setCurrentPage(1);
    };

    // Filter closures
    const filteredClosures = closures.filter((c) => {
        const matchesSearch =
            !debouncedSearch ||
            c.title.toLowerCase().includes(debouncedSearch) ||
            (c.roadName && c.roadName.toLowerCase().includes(debouncedSearch)) ||
            (c.barangay && c.barangay.toLowerCase().includes(debouncedSearch));

        if (!matchesSearch) return false;
        if (statusFilter === "ALL") return true;
        if (statusFilter === "ACTIVE") return c.status !== RoadClosureStatus.REOPENED;
        if (statusFilter === "REOPENED") return c.status === RoadClosureStatus.REOPENED;
        return c.status === statusFilter;
    });

    // Pagination calculations
    const totalItems = filteredClosures.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedClosures = filteredClosures.slice(startIndex, startIndex + pageSize);

    const activeCount = closures.filter((c) => c.status !== RoadClosureStatus.REOPENED).length;
    const closedCount = closures.filter((c) => c.status === RoadClosureStatus.CLOSED).length;
    const reopenedCount = closures.filter((c) => c.status === RoadClosureStatus.REOPENED).length;

    const handleToggleStatus = async (id: string, currentStatus: RoadClosureStatus) => {
        const nextStatus =
            currentStatus === RoadClosureStatus.REOPENED
                ? RoadClosureStatus.CLOSED
                : RoadClosureStatus.REOPENED;

        setActionLoadingId(id);
        try {
            const res = await toggleRoadClosureStatusAction(id, nextStatus);
            if (res.success && res.data) {
                setClosures((prev) =>
                    prev.map((item) => (item.id === id ? res.data : item))
                );
                toast.success(
                    nextStatus === RoadClosureStatus.REOPENED
                        ? "Road marked as REOPENED to traffic!"
                        : "Road marked as CLOSED!"
                );
            } else {
                toast.error(res.error || "Failed to change status.");
            }
        } catch {
            toast.error("An error occurred while updating road status.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const promptDelete = (closure: any) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Road Advisory",
            description: `Are you sure you want to permanently delete the road advisory for "${closure.title}" (${closure.roadName || closure.barangay || "Mapandan"})? This will remove all hazard pins and detour guidelines from the public road advisory portal.`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteRoadClosureAction(closure.id);
                    if (res.success) {
                        setClosures((prev) => prev.filter((item) => item.id !== closure.id));
                        toast.success("Road closure advisory deleted successfully!");
                        setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }));
                    } else {
                        toast.error(res.error || "Failed to delete.");
                    }
                } catch {
                    toast.error("Failed to delete record.");
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const getStatusBadge = (status: RoadClosureStatus) => {
        switch (status) {
            case RoadClosureStatus.CLOSED:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Closed
                    </span>
                );
            case RoadClosureStatus.PARTIALLY_CLOSED:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Partial
                    </span>
                );
            case RoadClosureStatus.DETOUR_ONLY:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Detour Only
                    </span>
                );
            case RoadClosureStatus.REOPENED:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Reopened
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Active Closures
                        </p>
                        <h3 className="text-2xl font-black mt-1 text-slate-800 dark:text-white">
                            {activeCount}
                        </h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Fully Closed Roads
                        </p>
                        <h3 className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
                            {closedCount}
                        </h3>
                    </div>
                    <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0c111d] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Reopened / Resolved
                        </p>
                        <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                            {reopenedCount}
                        </h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0c111d] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search road, barangay..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9 pr-8 h-11 rounded-2xl text-xs"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                        {["ALL", "ACTIVE", "REOPENED"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleStatusFilterChange(tab)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    statusFilter === tab
                                        ? "bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {tab === "ALL" ? "All" : tab === "ACTIVE" ? "Active Only" : "Reopened"}
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={() => {
                        setSelectedClosure(null);
                        setIsModalOpen(true);
                    }}
                    className="h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider px-5 shadow-lg shadow-amber-500/20"
                >
                    <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
                    New Road Closure
                </Button>
            </div>

            {/* Closures List: Spaced Cards Layout */}
            <div className="space-y-3.5">
                {(isMutating || isPageChanging) ? (
                    Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/80 dark:border-white/5 p-2 shadow-sm">
                            <RoadClosureRowSkeleton />
                        </div>
                    ))
                ) : paginatedClosures.length === 0 ? (
                    <div className="bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-white/5 p-12 text-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-base text-slate-800 dark:text-white">
                            No Road Closures Found
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            All roads in Mapandan are currently open, or no records match your filter criteria.
                        </p>
                    </div>
                ) : (
                    paginatedClosures.map((closure) => (
                        <div
                            key={closure.id}
                            className="bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/80 dark:border-white/5 p-5 hover:border-amber-500/30 dark:hover:border-amber-500/30 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                            <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    {getStatusBadge(closure.status)}
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-black uppercase tracking-wider rounded-lg px-2 py-0.5"
                                    >
                                        {closure.barangay || "Town-wide"}
                                    </Badge>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {format(new Date(closure.startDate), "MMM dd, yyyy h:mm a")}
                                    </span>
                                </div>

                                <h4 className="font-black text-base text-slate-900 dark:text-white truncate">
                                    {closure.title}
                                </h4>

                                {closure.roadName && (
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                        {closure.roadName}
                                    </p>
                                )}

                                {closure.detourAdvice && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                        <span className="font-bold text-amber-600 dark:text-amber-400">Detour: </span>
                                        {closure.detourAdvice}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={actionLoadingId === closure.id}
                                    onClick={() => handleToggleStatus(closure.id, closure.status)}
                                    className={`rounded-xl text-xs font-bold h-9 ${
                                        closure.status === RoadClosureStatus.REOPENED
                                            ? "text-rose-600 border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                            : "text-emerald-600 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                    }`}
                                >
                                    {actionLoadingId === closure.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : closure.status === RoadClosureStatus.REOPENED ? (
                                        "Mark Closed"
                                    ) : (
                                        "Mark Reopened"
                                    )}
                                </Button>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedClosure(closure);
                                        setIsModalOpen(true);
                                    }}
                                    className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => promptDelete(closure)}
                                    className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                                    title="Delete Road Advisory"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* System Standard Pagination Bar */}
            <div className="px-6 py-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#0c111d] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{totalItems === 0 ? 0 : startIndex + 1}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">
                            {Math.min(startIndex + pageSize, totalItems)}
                        </strong>{" "}
                        of <strong className="text-slate-900 dark:text-white font-black">{totalItems}</strong> listings
                    </span>

                    <div className="flex items-center gap-2 sm:ml-4 not-italic">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                            ROWS PER PAGE:
                        </span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(val) => {
                                setIsPageChanging(true);
                                setPageSize(Number(val));
                                setCurrentPage(1);
                                setTimeout(() => {
                                    setIsPageChanging(false);
                                }, 300);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[72px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] rounded-xl">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 not-italic">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => {
                            setIsPageChanging(true);
                            setCurrentPage((p) => Math.max(1, p - 1));
                            setTimeout(() => setIsPageChanging(false), 250);
                        }}
                        className="h-8 px-3 rounded-lg border-slate-200 dark:border-white/10 font-bold text-xs flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Prev
                    </Button>

                    <span className="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5">
                        {currentPage} / {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => {
                            setIsPageChanging(true);
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                            setTimeout(() => setIsPageChanging(false), 250);
                        }}
                        className="h-8 px-3 rounded-lg border-slate-200 dark:border-white/10 font-bold text-xs flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Modal for Create/Edit */}
            {isModalOpen && (
                <RoadClosureModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    closureToEdit={selectedClosure}
                    barangaysList={barangaysList}
                    userManagedBarangay={userManagedBarangay}
                    isBarangayAdmin={isBarangayAdmin}
                    onSuccess={(savedData, isEdit) => {
                        setIsMutating(true);
                        if (isEdit) {
                            setClosures((prev) =>
                                prev.map((item) => (item.id === savedData.id ? savedData : item))
                            );
                        } else {
                            setClosures((prev) => [savedData, ...prev]);
                        }
                        // Short sleek timeout to smoothly finish pulse
                        setTimeout(() => {
                            setIsMutating(false);
                        }, 400);
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModalConfig.isOpen}
                onClose={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={deleteModalConfig.onConfirm}
                title={deleteModalConfig.title}
                description={deleteModalConfig.description}
                isLoading={isDeleting}
            />
        </div>
    );
}
