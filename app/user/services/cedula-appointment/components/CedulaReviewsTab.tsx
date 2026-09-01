"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Star, MessageSquareHeart, Award, ThumbsUp, Search, Filter, Loader2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCedulaFeedbacksAction } from "../actions";

interface CedulaReviewsTabProps {
    feedbacks: any[];
    stats: {
        totalFeedbacks: number;
        averageRating: number;
        csatPercentage: number;
        ratingCounts: Record<string, number>;
    };
    themeColor?: string;
    initialPagination?: {
        page: number;
        limit: number;
        totalCount: number;
        hasMore: boolean;
        remainingCount: number;
    };
}

const RATING_MAP: Record<string, { label: string; num: number; color: string }> = {
    FIVE: { label: "Outstanding", num: 5, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    FOUR: { label: "Great", num: 4, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    THREE: { label: "Good", num: 3, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    TWO: { label: "Fair", num: 2, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    ONE: { label: "Poor", num: 1, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
};

const STAR_LEVELS = [
    { key: "FIVE", label: "5 Stars", stars: 5, color: "bg-emerald-500" },
    { key: "FOUR", label: "4 Stars", stars: 4, color: "bg-blue-500" },
    { key: "THREE", label: "3 Stars", stars: 3, color: "bg-amber-500" },
    { key: "TWO", label: "2 Stars", stars: 2, color: "bg-orange-500" },
    { key: "ONE", label: "1 Star", stars: 1, color: "bg-rose-500" }
];

export default function CedulaReviewsTab({
    feedbacks: initialFeedbacks,
    stats,
    themeColor = "#2563eb",
    initialPagination = { page: 1, limit: 12, totalCount: 0, hasMore: false, remainingCount: 0 }
}: CedulaReviewsTabProps) {
    const [search, setSearch] = useState("");
    const [ratingFilter, setRatingFilter] = useState("ALL");
    const [feedbacks, setFeedbacks] = useState<any[]>(initialFeedbacks);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialPagination.hasMore);
    const [remainingCount, setRemainingCount] = useState(initialPagination.remainingCount);
    const [loadingMore, setLoadingMore] = useState(false);
    const [, startTransition] = useTransition();

    const total = stats.totalFeedbacks || 0;

    // Fetch filtered or search results from server
    const fetchFilteredReviews = useCallback((query: string, rating: string) => {
        startTransition(async () => {
            const res = await getCedulaFeedbacksAction({
                page: 1,
                limit: 12,
                rating,
                search: query
            });

            if (res.success) {
                setFeedbacks(res.data || []);
                setPage(1);
                setHasMore(res.pagination?.hasMore || false);
                setRemainingCount(res.pagination?.remainingCount || 0);
            }
        });
    }, []);

    // Debounced filter/search trigger
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchFilteredReviews(search, ratingFilter);
        }, 300);

        return () => clearTimeout(handler);
    }, [search, ratingFilter, fetchFilteredReviews]);

    // Handle "Load More" Click
    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await getCedulaFeedbacksAction({
                page: nextPage,
                limit: 12,
                rating: ratingFilter,
                search
            });

            if (res.success && res.data) {
                setFeedbacks(prev => [...prev, ...res.data]);
                setPage(nextPage);
                setHasMore(res.pagination?.hasMore || false);
                setRemainingCount(res.pagination?.remainingCount || 0);
            }
        } catch (err) {
            console.error("Failed to load more reviews:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-400">
            {/* Header & KPI Metrics Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Average Rating Score Card */}
                <Card className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Average Rating
                        </span>
                        <div
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: themeColor }}
                        >
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>

                    <div className="pt-1.5 sm:pt-2">
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {stats.averageRating.toFixed(1)}
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-400 font-bold">/ 5.0</span>
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(starNum => (
                                <Star
                                    key={starNum}
                                    className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                        starNum <= Math.round(stats.averageRating)
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-slate-200 dark:text-slate-700"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <p className="text-[8px] sm:text-[10px] text-slate-400 italic mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-white/5 truncate">
                        Based on {total} {total === 1 ? "review" : "reviews"}
                    </p>
                </Card>

                {/* CSAT Satisfaction Score Card */}
                <Card className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Satisfaction (CSAT)
                        </span>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>

                    <div className="pt-1.5 sm:pt-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {stats.csatPercentage}%
                            </span>
                        </div>
                        <p className="text-[9px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1 truncate">
                            Positive Ratings (4★ & 5★)
                        </p>
                    </div>

                    <p className="text-[8px] sm:text-[10px] text-slate-400 italic mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-white/5 truncate">
                        Treasury benchmark
                    </p>
                </Card>

                {/* Total Feedback Submissions Card */}
                <Card className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Submissions
                        </span>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <MessageSquareHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>

                    <div className="pt-1.5 sm:pt-2">
                        <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {total}
                        </span>
                        <p className="text-[9px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1 truncate">
                            Cedulas Rated
                        </p>
                    </div>

                    <p className="text-[8px] sm:text-[10px] text-slate-400 italic mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-white/5 truncate">
                        Public ratings
                    </p>
                </Card>

                {/* Rating Distribution Breakdown */}
                <Card className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm flex flex-col justify-center space-y-1 sm:space-y-1.5">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                        Rating Distribution
                    </span>

                    <div className="space-y-1">
                        {STAR_LEVELS.map(level => {
                            const count = stats.ratingCounts[level.key] || 0;
                            const percent = total > 0 ? (count / total) * 100 : 0;

                            return (
                                <div key={level.key} className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px]">
                                    <span className="w-10 sm:w-12 text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                        {level.stars} ★
                                    </span>
                                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${level.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="w-5 sm:w-6 text-right font-mono text-slate-600 dark:text-slate-300 font-bold">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Search reviews or remarks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                        <SelectTrigger className="h-9 sm:h-10 text-xs rounded-lg sm:rounded-xl w-full sm:w-[140px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
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
                </div>
            </Card>

            {/* Reviews Stream Feed */}
            {feedbacks.length === 0 ? (
                <Card className="p-12 text-center rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] space-y-3">
                    <MessageSquareHeart className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        No Citizen Reviews Found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {feedbacks.length === 0
                            ? "Be the first to rate your experience after claiming your Community Tax Certificate!"
                            : "No reviews match your selected filter criteria."}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {feedbacks.map((item: any) => {
                        const ratingInfo = RATING_MAP[item.rating] || RATING_MAP.FIVE;
                        const profile = item.user?.residentProfile;
                        const citizenName = profile
                            ? `${profile.firstName} ${profile.lastName.charAt(0)}.`
                            : item.user?.name || "Verified Citizen";
                        const serviceName =
                            item.transactionType?.name ||
                            item.transaction?.type?.name ||
                            "Cedula (CTC)";

                        return (
                            <Card
                                key={item.id}
                                className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4 hover:shadow-md transition-shadow"
                            >
                                <div className="space-y-2.5 sm:space-y-3">
                                    {/* Top Metadata */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 sm:gap-2.5">
                                            <div
                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs text-white shadow-sm shrink-0"
                                                style={{ backgroundColor: themeColor }}
                                            >
                                                {citizenName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                    {citizenName}
                                                </p>
                                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                                                    {new Date(item.createdAt).toLocaleDateString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md border ${ratingInfo.color}`}
                                        >
                                            {ratingInfo.label} ({ratingInfo.num}/5)
                                        </Badge>
                                    </div>

                                    {/* Stars & Service Type */}
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map(starNum => (
                                                <Star
                                                    key={starNum}
                                                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                                                        starNum <= ratingInfo.num
                                                            ? "text-amber-400 fill-amber-400"
                                                            : "text-slate-200 dark:text-slate-700"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-[8px] sm:text-[9px] font-bold rounded-lg bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 truncate max-w-[140px] sm:max-w-none"
                                        >
                                            {serviceName}
                                        </Badge>
                                    </div>

                    {/* Comment Quote */}
                                    {item.comment ? (
                                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed whitespace-pre-wrap break-words pt-1">
                                            &ldquo;{item.comment}&rdquo;
                                        </p>
                                    ) : (
                                        <p className="text-[10px] sm:text-[11px] text-slate-400 italic pt-1">
                                            No additional comment written.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Load More Action Button */}
            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        variant="outline"
                        className="h-11 px-8 rounded-xl text-xs font-black uppercase tracking-wider border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all gap-2 shadow-sm"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                <span>Loading reviews...</span>
                            </>
                        ) : (
                            <>
                                <span>Load More Reviews ({remainingCount} remaining)</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </>
                        )}
                    </Button>
                </div>
            )}

            {!hasMore && feedbacks.length > 6 && (
                <div className="text-center py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                        ✨ You have viewed all community reviews
                    </p>
                </div>
            )}
        </div>
    );
}
