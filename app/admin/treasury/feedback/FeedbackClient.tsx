"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Star,
    Search,
    RefreshCcw,
    ExternalLink,
    MessageSquareHeart,
    Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import FeedbackStats from "./components/FeedbackStats";
import FeedbackDetailModal from "./components/FeedbackDetailModal";

interface FeedbackClientProps {
    initialData: any[];
    pagination: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
        limit: number;
    };
    stats: {
        totalFeedbacks: number;
        averageRating: number;
        csatPercentage: number;
        ratingCounts: Record<string, number>;
    };
    themeColor?: string;
}

const RATING_MAP: Record<string, { label: string; num: number; color: string }> = {
    FIVE: { label: "Outstanding", num: 5, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    FOUR: { label: "Great", num: 4, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    THREE: { label: "Good", num: 3, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    TWO: { label: "Fair", num: 2, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    ONE: { label: "Poor", num: 1, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
};

export default function FeedbackClient({
    initialData,
    pagination,
    stats,
    themeColor = "#2563eb"
}: FeedbackClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [rating, setRating] = useState(searchParams.get("rating") || "ALL");

    // Modal state for inspecting a specific feedback record
    const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const isInitialMount = useRef(true);

    const updateFilters = React.useCallback((newParams: Record<string, string | null>) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        Object.entries(newParams).forEach(([key, val]) => {
            if (val === null || val === "" || val === "ALL") {
                current.delete(key);
            } else {
                current.set(key, val);
            }
        });

        startTransition(() => {
            router.push(`/admin/treasury/feedback?${current.toString()}`);
        });
    }, [router, searchParams]);

    // 400ms Debounce for Search Bar Input
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const handler = setTimeout(() => {
            const currentSearchInUrl = searchParams.get("search") || "";
            if (search !== currentSearchInUrl) {
                updateFilters({ search, page: "1" });
            }
        }, 400);

        return () => {
            clearTimeout(handler);
        };
    }, [search, searchParams, updateFilters]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search, page: "1" });
    };

    const handleReset = () => {
        setSearch("");
        setRating("ALL");
        startTransition(() => {
            router.push("/admin/treasury/feedback");
        });
    };

    const handleOpenDetail = (item: any) => {
        setSelectedFeedback(item);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* KPI Metrics */}
            <FeedbackStats stats={stats} themeColor={themeColor} />

            {/* Filter and Search Bar */}
            <Card className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search Input */}
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Search by citizen name, queue # or comment..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                        />
                    </form>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {/* Rating Filter */}
                        <Select
                            value={rating}
                            onValueChange={val => {
                                setRating(val);
                                updateFilters({ rating: val, page: "1" });
                            }}
                        >
                            <SelectTrigger className="h-10 text-xs rounded-xl min-w-[130px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                <SelectValue placeholder="All Ratings" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl text-xs">
                                <SelectItem value="ALL">All Ratings</SelectItem>
                                <SelectItem value="FIVE">5 Stars ★★★★★</SelectItem>
                                <SelectItem value="FOUR">4 Stars ★★★★</SelectItem>
                                <SelectItem value="THREE">3 Stars ★★★</SelectItem>
                                <SelectItem value="TWO">2 Stars ★★</SelectItem>
                                <SelectItem value="ONE">1 Star ★</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Refresh / Reset Button */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleReset}
                            disabled={isPending}
                            title="Reset filters"
                            className="h-10 w-10 rounded-xl shrink-0 cursor-pointer"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Feedback Records Table */}
            <Card className="rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm overflow-hidden relative">
                {/* Subtle loading overlay during page transitions */}
                {isPending && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl shadow-lg">
                            <RefreshCcw className="w-4 h-4 animate-spin text-primary" />
                            <span>Updating records...</span>
                        </div>
                    </div>
                )}

                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: themeColor }}
                        >
                            <MessageSquareHeart className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                            Citizen Feedback Records
                        </h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-white/[0.02]">
                            <TableRow className="border-b border-slate-100 dark:border-white/5 hover:bg-transparent">
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400 py-3.5">
                                    Citizen / Applicant
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Service Type
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Rating
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400 min-w-[260px]">
                                    Comments & Suggestions
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Date Recorded
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-right pr-5">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <MessageSquareHeart className="w-8 h-8 opacity-40 text-slate-400" />
                                            <p className="text-xs font-semibold">No citizen feedback records found.</p>
                                            <p className="text-[10px] text-slate-500">
                                                Ratings submitted by citizens on released transactions will appear here.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                initialData.map(item => {
                                    const ratingInfo = RATING_MAP[item.rating] || RATING_MAP.FIVE;
                                    const profile = item.user?.residentProfile;
                                    const citizenName = profile
                                        ? `${profile.firstName} ${profile.lastName}`
                                        : item.user?.name || "Verified Citizen";
                                    const serviceName =
                                        item.transactionType?.name ||
                                        item.transaction?.type?.name ||
                                        "Treasury Service";

                                    return (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => handleOpenDetail(item)}
                                            className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                        >
                                            {/* Citizen Profile */}
                                            <TableCell className="py-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {citizenName}
                                                    </p>
                                                </div>
                                            </TableCell>

                                            {/* Service Type */}
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] font-bold rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
                                                >
                                                    {serviceName}
                                                </Badge>
                                            </TableCell>

                                            {/* Rating Badge & Stars */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(starNum => (
                                                            <Star
                                                                key={starNum}
                                                                className={`w-3.5 h-3.5 ${
                                                                    starNum <= ratingInfo.num
                                                                        ? "text-amber-400 fill-amber-400"
                                                                        : "text-slate-200 dark:text-slate-700"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span
                                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${ratingInfo.color}`}
                                                    >
                                                        {ratingInfo.label} ({ratingInfo.num}/5)
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Citizen Comments (Truncated with Ellipsis) */}
                                            <TableCell className="max-w-[280px]">
                                                {item.comment ? (
                                                    <p
                                                        className="text-xs text-slate-700 dark:text-slate-300 italic truncate max-w-[280px]"
                                                        title={item.comment}
                                                    >
                                                        &ldquo;{item.comment}&rdquo;
                                                    </p>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">
                                                        No additional comment written.
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Date Recorded */}
                                            <TableCell>
                                                <div className="space-y-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                                    <p>
                                                        {new Date(item.createdAt).toLocaleDateString("en-PH", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400">
                                                        {new Date(item.createdAt).toLocaleTimeString("en-PH", {
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                            hour12: true
                                                        })}
                                                    </p>
                                                </div>
                                            </TableCell>

                                            {/* Direct Transaction Link Action */}
                                            <TableCell className="text-right pr-5">
                                                {item.transaction?.id ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                    >
                                                        <Link href={`/admin/treasury/${item.transaction.id}?category=${item.transaction?.type?.category || "CEDULA"}`}>
                                                            <span>Transaction</span>
                                                            <ExternalLink className="w-3 h-3 ml-1" />
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls — matching Treasury Dashboard style */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span className="hidden sm:inline-block">Rows per page:</span>
                        <Select
                            value={pagination.limit.toString()}
                            onValueChange={(val) => updateFilters({ limit: val, page: "1" })}
                        >
                            <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg text-xs font-bold">
                                <SelectValue placeholder={pagination.limit} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] text-xs">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            Showing {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    updateFilters({ page: String(Math.max(pagination.currentPage - 1, 1)) })
                                }
                                disabled={pagination.currentPage === 1 || isPending}
                                className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold text-xs cursor-pointer"
                            >
                                Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    updateFilters({ page: String(Math.min(pagination.currentPage + 1, pagination.totalPages)) })
                                }
                                disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0 || isPending}
                                className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold text-xs cursor-pointer"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Inspect Specific Feedback Detail Modal */}
            <FeedbackDetailModal
                feedback={selectedFeedback}
                open={modalOpen}
                onOpenChange={setModalOpen}
                themeColor={themeColor}
            />
        </div>
    );
}
