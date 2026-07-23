"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
    Trophy,
    RefreshCw,
    Shield,
    FileText,
    DollarSign,
    Users,
    Award,
    Calendar,
    Search
} from "lucide-react";
import { toast } from "sonner";
import { getEnforcerLeaderboard } from "@/app/admin/poso/actions";

export interface LeaderboardItem {
    rank: number;
    officerName: string;
    badgeNo: string;
    totalTickets: number;
    totalAmount: number;
    paidTickets: number;
    unpaidTickets: number;
    settlementRate: number;
}

interface SummaryData {
    totalCitations: number;
    totalRevenue: number;
    topOfficer: string;
    officersCount: number;
}

interface LeaderboardPageProps {
    initialLeaderboard: LeaderboardItem[];
    initialSummary: SummaryData;
}

export default function LeaderboardPage({
    initialLeaderboard,
    initialSummary,
}: LeaderboardPageProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>(initialLeaderboard);
    const [summary, setSummary] = useState<SummaryData>(initialSummary);

    // Filters
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [sortBy, setSortBy] = useState<"ALL" | "TICKETS" | "AMOUNT">("ALL");
    const [search, setSearch] = useState("");
    const [isPending, setIsPending] = useState(false);

    const handleFetchData = async (
        overrideFromDate?: string,
        overrideToDate?: string,
        overrideSortBy?: "ALL" | "TICKETS" | "AMOUNT"
    ) => {
        setIsPending(true);
        try {
            const res = await getEnforcerLeaderboard({
                fromDate: overrideFromDate !== undefined ? overrideFromDate : fromDate,
                toDate: overrideToDate !== undefined ? overrideToDate : toDate,
                sortBy: overrideSortBy !== undefined ? overrideSortBy : sortBy,
            });

            if (res.success && res.leaderboard) {
                setLeaderboard(res.leaderboard);
                if (res.summary) setSummary(res.summary);
            } else {
                toast.error(res.error || "Failed to fetch leaderboard data.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsPending(false);
        }
    };

    const handleSortChange = (value: "ALL" | "TICKETS" | "AMOUNT") => {
        setSortBy(value);
        handleFetchData(fromDate, toDate, value);
    };

    const handleResetFilters = () => {
        setFromDate("");
        setToDate("");
        setSortBy("ALL");
        setSearch("");
        handleFetchData("", "", "ALL");
    };

    const filteredList = leaderboard.filter((item) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
            item.officerName.toLowerCase().includes(query) ||
            item.badgeNo.toLowerCase().includes(query)
        );
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 rounded-2xl">
                            <Trophy className="w-8 h-8 stroke-[2]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                                POSO Enforcer Leaderboard
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">
                                Performance Ranking, Citation Statistics & Revenue Generation Analytics
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <Button
                        onClick={() => handleFetchData()}
                        variant="outline"
                        disabled={isPending}
                        className="rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin text-amber-500" : ""}`} />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Enforcer</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white italic mt-1 truncate max-w-[170px]">
                            {summary.topOfficer}
                        </p>
                    </div>
                    <div className="p-3.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                        <Award className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Citations Issued</span>
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400 italic mt-1">
                            {summary.totalCitations}
                        </p>
                    </div>
                    <div className="p-3.5 bg-rose-500/10 text-rose-600 rounded-2xl">
                        <FileText className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fines & Fees</span>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 italic mt-1">
                            ₱ {summary.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                        <DollarSign className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Officers</span>
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400 italic mt-1">
                            {summary.officersCount}
                        </p>
                    </div>
                    <div className="p-3.5 bg-blue-500/10 text-blue-600 rounded-2xl">
                        <Users className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search & Metric Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search officer name or badge..."
                                className="pl-10 h-11 rounded-2xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold"
                            />
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                onClick={() => handleSortChange("ALL")}
                                variant={sortBy === "ALL" ? "default" : "ghost"}
                                className={`h-9 rounded-xl text-xs font-bold transition-all ${
                                    sortBy === "ALL" ? "bg-amber-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400"
                                }`}
                            >
                                All (Balanced)
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSortChange("TICKETS")}
                                variant={sortBy === "TICKETS" ? "default" : "ghost"}
                                className={`h-9 rounded-xl text-xs font-bold transition-all ${
                                    sortBy === "TICKETS" ? "bg-amber-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400"
                                }`}
                            >
                                By Total Tickets
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSortChange("AMOUNT")}
                                variant={sortBy === "AMOUNT" ? "default" : "ghost"}
                                className={`h-9 rounded-xl text-xs font-bold transition-all ${
                                    sortBy === "AMOUNT" ? "bg-amber-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400"
                                }`}
                            >
                                By Total Amount
                            </Button>
                        </div>
                    </div>

                    {/* Date Range Inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10">
                            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">From:</span>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="h-8 w-32 border-0 bg-transparent text-xs font-semibold p-0 focus-visible:ring-0"
                                />
                            </div>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">To:</span>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="h-8 w-32 border-0 bg-transparent text-xs font-semibold p-0 focus-visible:ring-0"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={() => handleFetchData()}
                            disabled={isPending}
                            className="h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-md"
                        >
                            Filter Date
                        </Button>

                        {(fromDate || toDate || sortBy !== "ALL" || search) && (
                            <Button
                                onClick={handleResetFilters}
                                variant="ghost"
                                className="h-11 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-900"
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-[#2a3040] rounded-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/70 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[90px] text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14">
                                    Rank
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Enforcer Officer Name & Badge No.
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Total Tickets Issued
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-6">
                                    Total Amount Generated
                                </TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8 font-black">
                                    Paid / Unpaid Ratio
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040] animate-pulse">
                                        <TableCell className="text-center py-5">
                                            <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full ml-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold italic">
                                        No enforcer citations recorded for the selected date range.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredList.map((item) => (
                                    <TableRow key={item.officerName} className="border-b border-slate-100 dark:border-[#2a3040]">
                                        <TableCell className="text-center py-5">
                                            {item.rank === 1 ? (
                                                <Badge className="bg-amber-500 text-white font-black px-2.5 py-1 text-xs shadow-md shadow-amber-500/20">
                                                    🥇 #1
                                                </Badge>
                                            ) : item.rank === 2 ? (
                                                <Badge className="bg-slate-400 text-white font-black px-2.5 py-1 text-xs">
                                                    🥈 #2
                                                </Badge>
                                            ) : item.rank === 3 ? (
                                                <Badge className="bg-amber-700 text-white font-black px-2.5 py-1 text-xs">
                                                    🥉 #3
                                                </Badge>
                                            ) : (
                                                <span className="font-mono text-xs font-bold text-slate-500">
                                                    #{item.rank}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl">
                                                    <Shield className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white uppercase italic">
                                                        {item.officerName}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-slate-500">
                                                        Badge: {item.badgeNo}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-sm text-slate-900 dark:text-white">
                                            {item.totalTickets}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-sm text-emerald-600 dark:text-emerald-400 pr-6">
                                            ₱ {item.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex items-center justify-end space-x-1.5 text-xs font-bold">
                                                <span className="text-emerald-600 dark:text-emerald-400">{item.paidTickets} Paid</span>
                                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                                <span className="text-rose-600 dark:text-rose-400">{item.unpaidTickets} Unpaid</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
