"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search, RefreshCcw, Activity, CheckCircle2,
    Clock, XCircle, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { getRHUAdminTransactions } from "../actions";
import { fetchAndCallNextTicket } from "@/app/admin/transactions/calling-actions";
import { supabase } from "@/lib/supabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getAdditionalData(tx: any): any {
    if (!tx?.additionalData) return {};
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

const CHECKUP_TYPES = [
    { id: "ALL", label: "All Consultations" },
    { id: "General Consultation", label: "General Consultation" },
    { id: "Pre-Marital", label: "Pre-Marital" },
    { id: "Prenatal / Maternal", label: "Prenatal / Maternal" },
    { id: "Pediatric", label: "Pediatric" },
    { id: "Dental", label: "Dental" },
];

interface ResponsiveTabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabSelect: (id: string) => void;
}

function ResponsiveTabs({ tabs, activeTab, onTabSelect }: ResponsiveTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(tabs.length);
    const [isMounted, setIsMounted] = useState(false);
    const [hasWidths, setHasWidths] = useState(false);
    const tabWidthsRef = useRef<number[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const container = containerRef.current;
        if (!container) return;

        const children = Array.from(container.children) as HTMLElement[];
        
        // If we are showing all tabs, record their widths.
        if (children.length === tabs.length) {
            tabWidthsRef.current = children.map(child => child.offsetWidth);
            setHasWidths(true);
        }

        const handleResize = () => {
            const containerWidth = container.offsetWidth;
            const widths = tabWidthsRef.current;
            if (widths.length === 0) return;

            const gap = 8; // gap-2 is 8px
            const moreButtonWidth = 90; // Approx width of 'More' button + gap

            // Check if all tabs fit
            const totalWidthWithGaps = widths.reduce((acc, w, idx) => acc + w + (idx > 0 ? gap : 0), 0);
            
            if (totalWidthWithGaps <= containerWidth) {
                setVisibleCount(tabs.length);
                return;
            }

            // Find how many tabs fit
            let accumulatedWidth = 0;
            let count = 0;
            for (let i = 0; i < widths.length; i++) {
                const itemWidth = widths[i];
                const nextWidth = accumulatedWidth + itemWidth + (i > 0 ? gap : 0);
                if (nextWidth + gap + moreButtonWidth <= containerWidth) {
                    accumulatedWidth = nextWidth;
                    count++;
                } else {
                    break;
                }
            }

            setVisibleCount(Math.max(1, count));
        };

        handleResize();

        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [isMounted, tabs]);

    const visibleTabs = tabs.slice(0, visibleCount);
    const dropdownTabs = tabs.slice(visibleCount);
    const isDropdownTabActive = dropdownTabs.some(tab => tab.id === activeTab);

    if (!isMounted) {
        return (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabSelect(tab.id)}
                        className={cn(
                            "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                            activeTab === tab.id
                                ? "bg-rose-500 text-white border-rose-500 shadow-md scale-105"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-rose-400"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex items-center gap-2 w-full overflow-hidden pb-2">
            {(!hasWidths ? tabs : visibleTabs).map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabSelect(tab.id)}
                    className={cn(
                        "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0",
                        activeTab === tab.id
                            ? "bg-rose-500 text-white border-rose-500 shadow-md scale-105"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-rose-400"
                    )}
                >
                    {tab.label}
                </button>
            ))}

            {hasWidths && dropdownTabs.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                                isDropdownTabActive
                                    ? "bg-rose-500 text-white border-rose-500 shadow-md"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-rose-400"
                            )}
                        >
                            {isDropdownTabActive
                                ? dropdownTabs.find(t => t.id === activeTab)?.label
                                : "More"}
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg min-w-48">
                        {dropdownTabs.map((tab) => (
                            <DropdownMenuItem
                                key={tab.id}
                                onClick={() => onTabSelect(tab.id)}
                                className={cn(
                                    "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors focus:bg-rose-500/10 focus:text-rose-500 dark:focus:bg-rose-500/20 dark:focus:text-rose-400",
                                    activeTab === tab.id
                                        ? "text-rose-500 dark:text-rose-400 font-extrabold"
                                        : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                {tab.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

export default function ConsultationsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlCheckup = searchParams.get("checkupType") || "ALL";

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [checkupFilter, setCheckupFilter] = useState(urlCheckup);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [centerName, setCenterName] = useState<string | null>(null);

    useEffect(() => {
        setCheckupFilter(urlCheckup);
        setPage(1);
    }, [urlCheckup]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const txRes = await getRHUAdminTransactions({
                status: statusFilter,
                page,
                limit: 10,
                search,
                checkupType: checkupFilter === "ALL" ? undefined : checkupFilter
            });

            if (txRes.success && txRes.data) {
                setTransactions(txRes.data);
                setCenterName(txRes.centerName || null);
                if (txRes.pagination) {
                    setTotalPages(txRes.pagination.totalPages || 1);
                }
            } else {
                toast.error(txRes.error || "Failed to load RHU consultations.");
            }
        } catch {
            toast.error("Error connecting to server.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [statusFilter, page, search, checkupFilter]);

    // Supabase Real-time + 30-second Polling Fallback
    useEffect(() => {
        loadData(false);

        const pollInterval = setInterval(() => {
            loadData(true);
        }, 30000);

        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("realtime-rhu-consultations")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Transaction" },
                    (payload: any) => {
                        console.log("RHU Consultations Realtime Update: Transaction change detected", payload);
                        loadData(true);
                    }
                )
                .subscribe();
        }

        return () => {
            clearInterval(pollInterval);
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [loadData]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCallNextTicket = async () => {
        try {
            const result = await fetchAndCallNextTicket("Rural Health Unit");
            if (result.success && result.data) {
                const txData: any = result.data;
                toast.success(`Now Calling Ticket #${txData.controlNumber || txData.id.slice(0, 8)}`);
                loadData(false);
            } else {
                toast.info(result.error || "No waiting patients in queue.");
            }
        } catch {
            toast.error("Failed to call next ticket.");
        }
    };

    const getEffectiveRHUStatus = (tx: any): string => {
        const addData = typeof tx?.additionalData === 'string'
            ? (JSON.parse(tx.additionalData || '{}'))
            : (tx?.additionalData || {});
        if (addData?.rhuStatus) return addData.rhuStatus;
        if (tx?.isCancelled || tx?.status === "REJECTED" || tx?.status === "CANCELLED") return "CANCELLED";
        // Native RHU enum statuses - pass through directly
        if (["BOOKED", "CHECK_IN", "IN_CONSULTATION", "PRESCRIBED", "REFERRED", "COMPLETED"].includes(tx?.status)) return tx.status;
        // Legacy status mappings
        if (tx?.status === "FOR_CLAIM") return "DISPENSED";
        if (tx?.status === "FOR_PROCESSING") return "IN_CONSULTATION";
        if (tx?.status === "EVALUATED") return "CHECK_IN";
        if (tx?.status === "RELEASED" || tx?.status === "DELIVERED") return "COMPLETED";
        if (tx?.status === "FOR_INSPECTION" || tx?.status === "FOR_REQUESTING") return "APPOINTMENT_BOOKED";
        return tx?.status || "APPOINTMENT_BOOKED";
    };

    const getStatusBadge = (tx: any) => {
        const addData = getAdditionalData(tx);
        const rhuStatus = getEffectiveRHUStatus(tx);
        if (tx.isCancelled || rhuStatus === "CANCELLED" || tx.status === "REJECTED") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <XCircle className="w-3 h-3" /> Cancelled
                </span>
            );
        }

        switch (rhuStatus) {
            case "BOOKED":
            case "APPOINTMENT_BOOKED":
            case "FOR_REQUESTING":
            case "FOR_INSPECTION":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <Clock className="w-3 h-3" /> Booked
                    </span>
                );
            case "CHECK_IN":
            case "EVALUATED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Checked In
                    </span>
                );
            case "IN_CONSULTATION":
            case "FOR_PROCESSING":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        <Activity className="w-3 h-3" /> In Consultation
                    </span>
                );
            case "PRESCRIBED":
                if (!!(addData.dispenseInfo || addData.dispensedAt || addData.poDispensedByPharmacy)) {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                            <Clock className="w-3 h-3" /> Waiting for Approval
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Prescribed
                    </span>
                );
            case "DISPENSED":
            case "FOR_CLAIM":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        <Clock className="w-3 h-3" /> Waiting for Approval
                    </span>
                );
            case "REFERRED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                        <XCircle className="w-3 h-3" /> Referred
                    </span>
                );
            case "COMPLETED":
            case "RELEASED":
            case "DELIVERED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                );
            case "PO_APPROVED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        <CheckCircle2 className="w-3 h-3" /> PO Approved
                    </span>
                );
            default:
                if (tx.status === "FOR_CLAIM") {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                            <CheckCircle2 className="w-3 h-3" /> PO Approved
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3 h-3" /> {tx.status.replace("_", " ")}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-8 pb-16 w-full max-w-full">
            {/* Header with Counter Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-6 h-6 text-rose-500" />
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Medical <span className="text-rose-500">Consultations</span>
                        </h1>
                    </div>
                    {centerName && (
                        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 opacity-90 pl-1 mb-1 mt-0.5">
                            📍 {centerName}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        View, evaluate, and manage all clinical check-ups and patient bookings.
                    </p>
                </div>

            </div>

            {/* Sub-Category Filter Tabs */}
            <ResponsiveTabs
                tabs={CHECKUP_TYPES}
                activeTab={checkupFilter}
                onTabSelect={(id) => {
                    setCheckupFilter(id);
                    setPage(1);
                    if (id === "ALL") {
                        router.push("/admin/rhu/consultations");
                    } else {
                        router.push(`/admin/rhu/consultations?checkupType=${encodeURIComponent(id)}`);
                    }
                }}
            />

            {/* Filter & Table Container */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <Input
                            placeholder="Search patient name, control #, barangay..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">

                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                            <SelectTrigger className="h-10 w-44 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase">All Statuses</SelectItem>
                                <SelectItem value="APPOINTMENT_BOOKED" className="text-xs font-bold uppercase">Booked</SelectItem>
                                <SelectItem value="CHECK_IN" className="text-xs font-bold uppercase">Checked In</SelectItem>
                                <SelectItem value="IN_CONSULTATION" className="text-xs font-bold uppercase">In Consultation</SelectItem>
                                <SelectItem value="PRESCRIBED" className="text-xs font-bold uppercase">Prescribed</SelectItem>
                                <SelectItem value="REFERRED" className="text-xs font-bold uppercase">Referred</SelectItem>
                                <SelectItem value="COMPLETED" className="text-xs font-bold uppercase">Completed</SelectItem>
                                <SelectItem value="CANCELLED" className="text-xs font-bold uppercase">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            onClick={() => loadData(false)}
                            className="h-10 w-10 p-0 rounded-2xl border-slate-200 dark:border-white/10"
                        >
                            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-white/5">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Ref / Control #</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Patient / Applicant</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Check-up Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Appt Date & Slot</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Priority</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell className="py-4">
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-24 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-6 w-28 bg-slate-200 dark:bg-white/10 rounded-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-xs font-bold text-slate-400">
                                        No RHU consultations found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const resident = getResidentSnapshot(tx);
                                    const addData = getAdditionalData(tx);

                                    const patientName = resident.firstName
                                        ? `${resident.firstName} ${resident.lastName}`
                                        : tx.user?.name || "N/A";
                                    const isPriority = addData.isPriorityLane;
                                    const checkupDisplay = addData.checkupType === "OTHER"
                                        ? addData.customCheckupType || "Custom Check-up"
                                        : addData.checkupType || tx.type?.name || "Consultation";

                                    return (
                                        <TableRow
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/rhu/${tx.id}`)}
                                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {tx.controlNumber || tx.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {patientName}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 italic">
                                                        {addData.relationship ? `For: ${addData.relationship}` : "Self"} • Brgy. {resident.barangay || "Mapandan"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {checkupDisplay}
                                                    </span>
                                                    {addData.healthCenterName && (
                                                        <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                                                            {addData.healthCenterName}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {formatDateTime(tx.appointmentDate)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-rose-500 italic">
                                                        {tx.appointmentSlot || "Anytime"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isPriority ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">
                                                        Priority Lane
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">Regular</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(tx)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-slate-400">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-8 rounded-xl text-xs font-bold"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="h-8 rounded-xl text-xs font-bold"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
