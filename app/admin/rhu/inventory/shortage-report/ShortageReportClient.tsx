"use client";

import React, { useState, useMemo } from "react";
import {
    Pill,
    Search,
    Calendar,
    Eye,
    Download,
    Boxes,
    CheckCircle2,
    X,
    RotateCcw,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CalendarDays,
    Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RHUInventorySidebar } from "../components/RHUInventorySidebar";

interface ShortageReportClientProps {
    initialItems: any[];
    initialCenters: any[];
    currentUser?: any;
    matchedCenter?: any;
}

export default function ShortageReportClient({
    initialItems,
    initialCenters,
    currentUser: _currentUser,
    matchedCenter
}: ShortageReportClientProps) {
    const [items] = useState<any[]>(initialItems);
    const [facilityFilter, setFacilityFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Calendar & Date Range Filter States
    const [dateFilterTarget, setDateFilterTarget] = useState<"EXPIRATION" | "UPDATED">("EXPIRATION");
    const [datePreset, setDatePreset] = useState<string>("ALL");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

    const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filter shortage items: quantity <= reorderLevel or out of stock
    const shortageItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return items
            .filter(i => i.category === "MEDICINE" && (i.quantity <= i.reorderLevel || i.quantity <= 0))
            .map(i => {
                const isOutOfStock = i.quantity <= 0;
                const isCritical = !isOutOfStock && i.quantity <= Math.ceil(i.reorderLevel / 2);
                const status = isOutOfStock ? "Out of Stock" : (isCritical ? "Critical" : "Low Stock");
                const cat = i.genericName || "Pharmaceutical";
                const facility = i.healthCenterName || "RHU Mapandan";

                // Resolve earliest expiration date across item & batches (FEFO)
                const expDates: Date[] = [];
                if (i.expirationDate) {
                    const d = new Date(i.expirationDate);
                    if (!isNaN(d.getTime())) expDates.push(d);
                }
                if (Array.isArray(i.batches)) {
                    i.batches.forEach((b: any) => {
                        if (b.expirationDate) {
                            const d = new Date(b.expirationDate);
                            if (!isNaN(d.getTime())) expDates.push(d);
                        }
                    });
                }
                expDates.sort((a, b) => a.getTime() - b.getTime());
                const earliestExp = expDates.length > 0 ? expDates[0] : null;

                let expirationDisplay: string | null = null;
                let isExpired = false;
                let isExpiringSoon = false;
                let daysToExpiration: number | null = null;

                if (earliestExp) {
                    try {
                        expirationDisplay = format(earliestExp, "MMM d, yyyy");
                    } catch {
                        expirationDisplay = earliestExp.toLocaleDateString();
                    }
                    const diffTime = earliestExp.getTime() - today.getTime();
                    daysToExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    isExpired = daysToExpiration < 0;
                    isExpiringSoon = !isExpired && daysToExpiration <= 60;
                }

                return {
                    ...i,
                    shortageStatus: status,
                    categoryDisplay: cat,
                    facilityDisplay: facility,
                    earliestExpDate: earliestExp,
                    expirationDisplay,
                    isExpired,
                    isExpiringSoon,
                    daysToExpiration
                };
            });
    }, [items]);

    // Apply quick presets for dates
    const applyDatePreset = (preset: string) => {
        setDatePreset(preset);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (preset === "ALL") {
            setStartDate("");
            setEndDate("");
        } else if (preset === "EXPIRING_30") {
            const next = new Date(now);
            next.setDate(next.getDate() + 30);
            setStartDate(now.toISOString().split("T")[0]);
            setEndDate(next.toISOString().split("T")[0]);
        } else if (preset === "EXPIRING_60") {
            const next = new Date(now);
            next.setDate(next.getDate() + 60);
            setStartDate(now.toISOString().split("T")[0]);
            setEndDate(next.toISOString().split("T")[0]);
        } else if (preset === "EXPIRING_90") {
            const next = new Date(now);
            next.setDate(next.getDate() + 90);
            setStartDate(now.toISOString().split("T")[0]);
            setEndDate(next.toISOString().split("T")[0]);
        } else if (preset === "EXPIRED") {
            setStartDate("");
            setEndDate(now.toISOString().split("T")[0]);
        } else if (preset === "THIS_WEEK") {
            const day = now.getDay();
            const start = new Date(now);
            start.setDate(now.getDate() - day);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            setStartDate(start.toISOString().split("T")[0]);
            setEndDate(end.toISOString().split("T")[0]);
        } else if (preset === "THIS_MONTH") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setStartDate(start.toISOString().split("T")[0]);
            setEndDate(end.toISOString().split("T")[0]);
        } else if (preset === "LAST_30") {
            const start = new Date(now);
            start.setDate(now.getDate() - 30);
            setStartDate(start.toISOString().split("T")[0]);
            setEndDate(now.toISOString().split("T")[0]);
        } else if (preset === "THIS_YEAR") {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31);
            setStartDate(start.toISOString().split("T")[0]);
            setEndDate(end.toISOString().split("T")[0]);
        }
        setCurrentPage(1);
    };

    const handleClearDateFilter = () => {
        setDatePreset("ALL");
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
    };

    // Label on the date button
    const isDateFilterActive = datePreset !== "ALL" || Boolean(startDate || endDate);

    const dateFilterDisplayLabel = useMemo(() => {
        if (datePreset === "EXPIRING_30") return "Expiring in 30d";
        if (datePreset === "EXPIRING_60") return "Expiring in 60d";
        if (datePreset === "EXPIRING_90") return "Expiring in 90d";
        if (datePreset === "EXPIRED") return "Expired Meds";
        if (datePreset === "THIS_WEEK") return "Updated This Week";
        if (datePreset === "THIS_MONTH") return "This Month";
        if (datePreset === "LAST_30") return "Past 30 Days";
        if (datePreset === "THIS_YEAR") return "This Year";

        if (startDate && endDate) {
            try {
                const s = new Date(startDate);
                const e = new Date(endDate);
                return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
            } catch {
                return `${startDate} – ${endDate}`;
            }
        }
        if (startDate) {
            try {
                return `From ${format(new Date(startDate), "MMM d, yyyy")}`;
            } catch {
                return `From ${startDate}`;
            }
        }
        if (endDate) {
            try {
                return `Until ${format(new Date(endDate), "MMM d, yyyy")}`;
            } catch {
                return `Until ${endDate}`;
            }
        }
        return "All Dates";
    }, [datePreset, startDate, endDate]);

    // Filter by controls + date range
    const filteredItems = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return shortageItems.filter(i => {
            // Facility filter
            if (facilityFilter !== "ALL") {
                const fac = (i.healthCenterId || "").toLowerCase();
                const facName = (i.facilityDisplay || "").toLowerCase();
                if (fac !== facilityFilter.toLowerCase() && !facName.includes(facilityFilter.toLowerCase())) {
                    return false;
                }
            }

            // Category filter
            if (categoryFilter !== "ALL") {
                const cat = (i.categoryDisplay || "").toLowerCase();
                if (!cat.includes(categoryFilter.toLowerCase())) {
                    return false;
                }
            }

            // Status filter
            if (statusFilter !== "ALL" && i.shortageStatus !== statusFilter) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = i.name.toLowerCase().includes(q);
                const matchGen = (i.genericName || "").toLowerCase().includes(q);
                const matchBatch = (i.batchNumber || "").toLowerCase().includes(q);
                if (!matchName && !matchGen && !matchBatch) {
                    return false;
                }
            }

            // Date Range & Expiration filter
            if (isDateFilterActive) {
                if (dateFilterTarget === "EXPIRATION") {
                    const itemExp = i.earliestExpDate as Date | null;
                    if (!itemExp) return false;

                    if (datePreset === "EXPIRING_30") {
                        const in30 = new Date(now);
                        in30.setDate(in30.getDate() + 30);
                        in30.setHours(23, 59, 59, 999);
                        if (itemExp < now || itemExp > in30) return false;
                    } else if (datePreset === "EXPIRING_60") {
                        const in60 = new Date(now);
                        in60.setDate(in60.getDate() + 60);
                        in60.setHours(23, 59, 59, 999);
                        if (itemExp < now || itemExp > in60) return false;
                    } else if (datePreset === "EXPIRING_90") {
                        const in90 = new Date(now);
                        in90.setDate(in90.getDate() + 90);
                        in90.setHours(23, 59, 59, 999);
                        if (itemExp < now || itemExp > in90) return false;
                    } else if (datePreset === "EXPIRED") {
                        if (itemExp >= now) return false;
                    } else {
                        // Custom start/end bounds
                        if (startDate) {
                            const start = new Date(startDate);
                            start.setHours(0, 0, 0, 0);
                            if (itemExp < start) return false;
                        }
                        if (endDate) {
                            const end = new Date(endDate);
                            end.setHours(23, 59, 59, 999);
                            if (itemExp > end) return false;
                        }
                    }
                } else {
                    // Filter by Record / Last Updated date
                    const targetDate = i.updatedAt ? new Date(i.updatedAt) : (i.createdAt ? new Date(i.createdAt) : null);
                    if (!targetDate) return false;

                    if (datePreset === "THIS_WEEK") {
                        const dayOfWeek = now.getDay();
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - dayOfWeek);
                        startOfWeek.setHours(0, 0, 0, 0);
                        if (targetDate < startOfWeek) return false;
                    } else if (datePreset === "THIS_MONTH") {
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                        if (targetDate < startOfMonth) return false;
                    } else if (datePreset === "LAST_30") {
                        const past30 = new Date(now);
                        past30.setDate(past30.getDate() - 30);
                        if (targetDate < past30) return false;
                    } else if (datePreset === "THIS_YEAR") {
                        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                        if (targetDate < startOfYear) return false;
                    } else {
                        if (startDate) {
                            const start = new Date(startDate);
                            start.setHours(0, 0, 0, 0);
                            if (targetDate < start) return false;
                        }
                        if (endDate) {
                            const end = new Date(endDate);
                            end.setHours(23, 59, 59, 999);
                            if (targetDate > end) return false;
                        }
                    }
                }
            }

            return true;
        });
    }, [shortageItems, facilityFilter, categoryFilter, statusFilter, searchQuery, isDateFilterActive, dateFilterTarget, datePreset, startDate, endDate]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage]);

    const hasActiveFilters = facilityFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL" || searchQuery.trim() !== "" || isDateFilterActive;

    const handleResetFilters = () => {
        setFacilityFilter("ALL");
        setCategoryFilter("ALL");
        setStatusFilter("ALL");
        setSearchQuery("");
        handleClearDateFilter();
    };

    const handleExportCSV = () => {
        if (filteredItems.length === 0) {
            toast.error("No shortage items to export.");
            return;
        }

        const headers = ["Medicine Name", "Category", "Unit", "Current Stock", "Minimum Stock", "Status", "Earliest Expiration", "Facility"];
        const rows = filteredItems.map(m => [
            `"${m.name.replace(/"/g, '""')}"`,
            `"${(m.categoryDisplay || "").replace(/"/g, '""')}"`,
            m.unit || "pcs",
            m.quantity,
            m.reorderLevel,
            m.shortageStatus,
            m.expirationDisplay || "N/A",
            `"${(m.facilityDisplay || "RHU Mapandan").replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Medicine_Shortage_Report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Shortage report exported successfully!");
    };

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20 font-sans">
            {/* 2-Column Responsive Layout */}
            <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0 w-full space-y-6">
                    {/* Header Banner */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#162340] shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0f1b34] border border-blue-500/25 flex items-center justify-center text-slate-100 shrink-0 shadow-inner mt-0.5">
                                <Pill className="w-6 h-6 -rotate-45" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    Medicine Shortage Report
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                                    Monitor medicines with low or no stock across RHU and health centers. Ensure continuous availability of essential medicines for better healthcare service.
                                </p>
                            </div>
                        </div>

                        {/* Export Action in Banner */}
                        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                            <Button
                                onClick={handleExportCSV}
                                variant="outline"
                                className="h-10 px-4 text-xs font-semibold rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white shadow-sm gap-2 backdrop-blur-sm transition-all cursor-pointer hover:border-blue-500/40 hover:text-white"
                            >
                                <Download className="w-4 h-4 text-blue-400" />
                                <span>Export CSV</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <Card className="rounded-2xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-3 sm:p-3.5">
                        <CardContent className="p-0 flex flex-wrap items-center justify-between gap-2.5">
                            {/* Left Controls: Instant Search, Filter Dropdowns, Calendar Filter */}
                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                {/* Search by Name (Live instant search) */}
                                <div className="relative w-full sm:w-[185px]">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <Input
                                        placeholder="Search medicine..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="pl-8 pr-7 h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d] text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setCurrentPage(1);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                            title="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Facility Filter */}
                                <div className="w-full sm:w-[130px]">
                                    <Select 
                                        value={facilityFilter} 
                                        onValueChange={(val) => {
                                            setFacilityFilter(val);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                            <SelectValue placeholder="Facility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Facilities</SelectItem>
                                            <SelectItem value="RHU Mapandan">RHU Mapandan</SelectItem>
                                            <SelectItem value="RHU Sta. Monica">RHU Sta. Monica</SelectItem>
                                            <SelectItem value="Health Center San Isidro">Health Center San Isidro</SelectItem>
                                            <SelectItem value="RHU Sta. Fe">RHU Sta. Fe</SelectItem>
                                            <SelectItem value="RHU San Rafael">RHU San Rafael</SelectItem>
                                            <SelectItem value="Health Center Zone 2">Health Center Zone 2</SelectItem>
                                            {initialCenters.map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Medicine Category Filter */}
                                <div className="w-full sm:w-[125px]">
                                    <Select 
                                        value={categoryFilter} 
                                        onValueChange={(val) => {
                                            setCategoryFilter(val);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Categories</SelectItem>
                                            <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                                            <SelectItem value="Analgesic">Analgesic</SelectItem>
                                            <SelectItem value="Rehydration">Rehydration</SelectItem>
                                            <SelectItem value="Respiratory">Respiratory</SelectItem>
                                            <SelectItem value="Supplement">Supplement</SelectItem>
                                            <SelectItem value="Ophthalmic">Ophthalmic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Interactive Calendar & Date Filter Popover */}
                                <div className="relative">
                                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "h-9 px-3 text-xs rounded-xl border font-medium flex items-center gap-2 transition-all cursor-pointer",
                                                    isDateFilterActive
                                                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500/60 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                                                        : "bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <Calendar className={cn(
                                                    "w-3.5 h-3.5 shrink-0",
                                                    isDateFilterActive ? "text-blue-500" : "text-slate-400"
                                                )} />
                                                <span className="truncate max-w-[120px]">
                                                    {dateFilterDisplayLabel}
                                                </span>
                                                {isDateFilterActive ? (
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleClearDateFilter();
                                                        }}
                                                        className="p-0.5 rounded-full hover:bg-blue-200/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 -mr-1"
                                                        title="Clear date filter"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </span>
                                                ) : (
                                                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 opacity-70 -mr-1" />
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="start"
                                            sideOffset={6}
                                            className="w-[330px] p-4 rounded-2xl bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-2xl z-50 space-y-3.5 font-sans"
                                        >
                                            {/* Popover Header */}
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#162340]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Timeline & Expiration Filter</h4>
                                                        <p className="text-[10px] text-slate-400">Filter medicine shortage list</p>
                                                    </div>
                                                </div>
                                                {isDateFilterActive && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearDateFilter}
                                                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1"
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Clear
                                                    </button>
                                                )}
                                            </div>

                                            {/* Target Toggle */}
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Field</span>
                                                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0d1629] border border-slate-200/60 dark:border-[#1c2c4d]">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDateFilterTarget("EXPIRATION");
                                                            setDatePreset("ALL");
                                                            setStartDate("");
                                                            setEndDate("");
                                                        }}
                                                        className={cn(
                                                            "py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                                            dateFilterTarget === "EXPIRATION"
                                                                ? "bg-white dark:bg-[#162340] text-blue-600 dark:text-blue-400 shadow-sm"
                                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <CalendarDays className="w-3 h-3" /> Expiration
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDateFilterTarget("UPDATED");
                                                            setDatePreset("ALL");
                                                            setStartDate("");
                                                            setEndDate("");
                                                        }}
                                                        className={cn(
                                                            "py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                                            dateFilterTarget === "UPDATED"
                                                                ? "bg-white dark:bg-[#162340] text-blue-600 dark:text-blue-400 shadow-sm"
                                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <Clock className="w-3 h-3" /> Last Updated
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Presets</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyDatePreset("ALL")}
                                                        className={cn(
                                                            "text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer",
                                                            datePreset === "ALL" && !startDate && !endDate
                                                                ? "text-blue-500 font-bold"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                        )}
                                                    >
                                                        All Dates
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {dateFilterTarget === "EXPIRATION" ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("EXPIRING_30")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "EXPIRING_30"
                                                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                ⏳ Expiring ≤ 30 Days
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("EXPIRING_60")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "EXPIRING_60"
                                                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                ⚠️ Expiring ≤ 60 Days
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("EXPIRING_90")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "EXPIRING_90"
                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                📅 Expiring ≤ 90 Days
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("EXPIRED")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "EXPIRED"
                                                                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                🚫 Already Expired
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("THIS_WEEK")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "THIS_WEEK"
                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                📅 This Week
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("THIS_MONTH")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "THIS_MONTH"
                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                🗓️ This Month
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("LAST_30")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "LAST_30"
                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                ⏱️ Past 30 Days
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyDatePreset("THIS_YEAR")}
                                                                className={cn(
                                                                    "py-1.5 px-2.5 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer",
                                                                    datePreset === "THIS_YEAR"
                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                                                        : "border-slate-200 dark:border-[#1c2c4d] hover:bg-slate-50 dark:hover:bg-[#0d1629] text-slate-700 dark:text-slate-300"
                                                                )}
                                                            >
                                                                📊 This Year
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Custom Date Range */}
                                            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-[#162340]">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Date Range</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">From</label>
                                                        <input
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) => {
                                                                setStartDate(e.target.value);
                                                                setDatePreset("CUSTOM");
                                                                setCurrentPage(1);
                                                            }}
                                                            className="w-full h-8 px-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border border-slate-200 dark:border-[#1c2c4d] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 [color-scheme:light_dark]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">To</label>
                                                        <input
                                                            type="date"
                                                            value={endDate}
                                                            onChange={(e) => {
                                                                setEndDate(e.target.value);
                                                                setDatePreset("CUSTOM");
                                                                setCurrentPage(1);
                                                            }}
                                                            className="w-full h-8 px-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border border-slate-200 dark:border-[#1c2c4d] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 [color-scheme:light_dark]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Popover Footer Buttons */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#162340]">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearDateFilter}
                                                    className="h-8 px-2.5 text-xs text-slate-500 hover:text-rose-500 cursor-pointer"
                                                >
                                                    Reset Dates
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setIsDatePopoverOpen(false)}
                                                    className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Reset Filter Button */}
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-9 px-2.5 text-xs text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 font-semibold gap-1.5 rounded-xl cursor-pointer transition-all"
                                        title="Reset all filters"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shortage Report Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 dark:bg-[#0d1629]/90 border-b border-slate-200 dark:border-[#162340]">
                                    <TableRow className="border-0">
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 py-3.5">
                                            Medicine Name
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Category
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Unit
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Current Stock
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Minimum Stock
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Status
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Facility
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-[#162340]">
                                    {paginatedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                                                <p className="font-semibold text-sm">No medicine shortages matching filter</p>
                                                <p className="text-xs opacity-70 mt-0.5">Try clearing filters or selecting another date preset.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedItems.map((item) => {
                                            const isOutOfStock = item.shortageStatus === "Out of Stock";
                                            const isCritical = item.shortageStatus === "Critical";
                                            const isLowStock = item.shortageStatus === "Low Stock";

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0f1b34]/40 transition-colors">
                                                    <TableCell className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white py-3.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span>{item.name}</span>
                                                            {item.dosage && !item.name.includes(item.dosage) && (
                                                                <span className="text-slate-400 font-normal">({item.dosage})</span>
                                                            )}
                                                        </div>
                                                        {item.expirationDisplay && (
                                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 flex items-center gap-1">
                                                                <Calendar className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                                                <span className={cn(
                                                                    item.isExpired && "text-rose-500 font-bold",
                                                                    item.isExpiringSoon && "text-amber-500 font-semibold"
                                                                )}>
                                                                    Exp: {item.expirationDisplay}
                                                                    {item.isExpired && " (Expired)"}
                                                                    {item.isExpiringSoon && ` (${item.daysToExpiration}d)`}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                        {item.categoryDisplay}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                                        {item.unit || "pcs"}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-xs">
                                                        <span className={cn(
                                                            isOutOfStock && "text-[#ff0055]",
                                                            isCritical && "text-[#ff0055]",
                                                            isLowStock && "text-amber-500"
                                                        )}>
                                                            {item.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                                        {item.reorderLevel}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isOutOfStock && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#ff0055] text-white shadow-sm shadow-[#ff0055]/20">
                                                                Out of Stock
                                                            </span>
                                                        )}
                                                        {isCritical && (
                                                            <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-[#ff0055] text-white shadow-sm shadow-[#ff0055]/20">
                                                                Critical
                                                            </span>
                                                        )}
                                                        {isLowStock && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#f59e0b] text-slate-900 shadow-sm shadow-[#f59e0b]/20">
                                                                Low Stock
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                        {item.facilityDisplay}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            onClick={() => setSelectedItemDetail(item)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                                            title="View details & batches"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="p-4 border-t border-slate-200 dark:border-[#162340] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div>
                                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                                {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} medicines
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                                >
                                    &lt;
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <Button
                                        key={page}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg text-xs font-bold cursor-pointer",
                                            currentPage === page
                                                ? "bg-[#ff0055] text-white shadow-md shadow-[#ff0055]/30 hover:bg-rose-600"
                                                : "bg-slate-100 dark:bg-[#0d1629] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162340]"
                                        )}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                                >
                                    &gt;
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Stock Overview, Critical Shortages, Reminder */}
                {isSidebarCollapsed ? (
                    <div className="hidden xl:flex flex-col items-center gap-3 w-14 shrink-0 xl:sticky xl:top-4 p-2 rounded-2xl bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-xl text-slate-900 dark:text-white transition-all duration-300 animate-in fade-in slide-in-from-right-2">
                        {/* Expand Button */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-all cursor-pointer shadow-sm"
                            title="Expand Summary Sidebar"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="w-6 h-px bg-slate-200 dark:bg-[#162340] my-0.5" />

                        {/* Quick Stock Count Indicator */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#0f1b34] border border-blue-200 dark:border-blue-500/25 flex flex-col items-center justify-center text-blue-600 dark:text-slate-100 hover:scale-105 transition-transform cursor-pointer shadow-inner"
                            title={`Total Medicines: ${items.filter(i => i.category === 'MEDICINE').length}`}
                        >
                            <Pill className="w-4 h-4 -rotate-45" />
                            <span className="text-[9px] font-black leading-none mt-0.5">{items.filter(i => i.category === 'MEDICINE').length}</span>
                        </button>

                        {/* Critical Shortages Warning Indicator */}
                        {shortageItems.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="relative w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col items-center justify-center text-[#ff0055] hover:scale-105 transition-transform cursor-pointer shadow-sm"
                                title={`${shortageItems.length} Shortage / Critical Items`}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ff0055] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                    {shortageItems.length}
                                </span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="w-full xl:w-[340px] 2xl:w-[350px] shrink-0 space-y-4 xl:sticky xl:top-4 transition-all duration-300 animate-in fade-in slide-in-from-right-2">
                        <RHUInventorySidebar
                            items={items}
                            activeStockFilter={statusFilter === "ALL" ? "" : statusFilter}
                            onFilterChange={(filter) => {
                                if (filter === "ALL") setStatusFilter("ALL");
                                else if (filter === "OUT_OF_STOCK") setStatusFilter("Out of Stock");
                                else if (filter === "LOW_STOCK") setStatusFilter("Low Stock");
                            }}
                            healthCenterName={matchedCenter?.name || "RHU Mapandan"}
                            onCollapse={() => setIsSidebarCollapsed(true)}
                        />
                    </div>
                )}
            </div>

            {/* Item Batch Details Modal */}
            <Dialog open={!!selectedItemDetail} onOpenChange={() => setSelectedItemDetail(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
                            <Boxes className="w-5 h-5 text-rose-500" />
                            {selectedItemDetail?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Current shortage stock level, expiration details, and batch breakdown.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedItemDetail && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Current Stock:</span>
                                    <span className="font-bold text-sm text-rose-600">{selectedItemDetail.quantity} {selectedItemDetail.unit}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Reorder Threshold:</span>
                                    <span className="font-bold text-sm">{selectedItemDetail.reorderLevel} {selectedItemDetail.unit}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Facility:</span>
                                    <span className="font-semibold">{selectedItemDetail.facilityDisplay}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Status:</span>
                                    <span className="font-bold text-rose-500">{selectedItemDetail.shortageStatus}</span>
                                </div>
                                {selectedItemDetail.expirationDisplay && (
                                    <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Earliest Expiration:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedItemDetail.expirationDisplay}
                                            </span>
                                        </div>
                                        {selectedItemDetail.isExpired ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                Expired
                                            </span>
                                        ) : selectedItemDetail.isExpiringSoon ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                Expires in {selectedItemDetail.daysToExpiration}d
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Batches Logged</h4>
                                {(!selectedItemDetail.batches || selectedItemDetail.batches.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic py-2">No batch deliveries logged for this catalog item.</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {selectedItemDetail.batches.map((b: any) => (
                                            <div key={b.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                                                <div>
                                                    <span className="font-bold">#{b.batchNumber}</span>
                                                    <span className="text-slate-400 block text-[11px]">Exp: {b.expirationDate ? new Date(b.expirationDate).toLocaleDateString() : "N/A"}</span>
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{b.quantity} pcs</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
