"use client";

import React, { useState } from "react";
import {
    Plus,
    Search,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    Trash2,
    Edit2,
    MapPin,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoadClosureStatus } from "@prisma/client";
import { RoadClosureModal } from "./RoadClosureModal";
import { toggleRoadClosureStatusAction, deleteRoadClosureAction } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface RoadClosuresClientProps {
    initialClosures: any[];
    barangaysList: { id: string; name: string }[];
    userManagedBarangay?: string | null;
    isBarangayAdmin?: boolean;
}

export function RoadClosuresClient({
    initialClosures,
    barangaysList,
    userManagedBarangay,
    isBarangayAdmin,
}: RoadClosuresClientProps) {
    const [closures, setClosures] = useState<any[]>(initialClosures);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClosure, setSelectedClosure] = useState<any | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Filter closures
    const filteredClosures = closures.filter((c) => {
        const matchesSearch =
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            (c.roadName && c.roadName.toLowerCase().includes(search.toLowerCase())) ||
            (c.barangay && c.barangay.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;
        if (statusFilter === "ALL") return true;
        if (statusFilter === "ACTIVE") return c.status !== RoadClosureStatus.REOPENED;
        if (statusFilter === "REOPENED") return c.status === RoadClosureStatus.REOPENED;
        return c.status === statusFilter;
    });

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

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this road advisory?")) return;
        setActionLoadingId(id);
        try {
            const res = await deleteRoadClosureAction(id);
            if (res.success) {
                setClosures((prev) => prev.filter((item) => item.id !== id));
                toast.success("Road closure record deleted.");
            } else {
                toast.error(res.error || "Failed to delete.");
            }
        } catch {
            toast.error("Failed to delete record.");
        } finally {
            setActionLoadingId(null);
        }
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
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search road, barangay..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-11 rounded-2xl text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                        {["ALL", "ACTIVE", "REOPENED"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
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

            {/* Closures List / Table */}
            <div className="bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                {filteredClosures.length === 0 ? (
                    <div className="p-12 text-center">
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
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredClosures.map((closure) => (
                            <div
                                key={closure.id}
                                className="p-5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {getStatusBadge(closure.status)}
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] font-black uppercase tracking-wider rounded-lg"
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
                                        disabled={actionLoadingId === closure.id}
                                        onClick={() => handleDelete(closure.id)}
                                        className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                    onSuccess={() => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
