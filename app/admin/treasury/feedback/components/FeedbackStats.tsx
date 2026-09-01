"use client";

import React from "react";
import { Star, MessageSquareHeart, Award, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FeedbackStatsProps {
    stats: {
        totalFeedbacks: number;
        averageRating: number;
        csatPercentage: number;
        ratingCounts: Record<string, number>;
    };
    themeColor?: string;
}

const STAR_LEVELS = [
    { key: "FIVE", label: "5 Stars", stars: 5, color: "bg-emerald-500" },
    { key: "FOUR", label: "4 Stars", stars: 4, color: "bg-blue-500" },
    { key: "THREE", label: "3 Stars", stars: 3, color: "bg-amber-500" },
    { key: "TWO", label: "2 Stars", stars: 2, color: "bg-orange-500" },
    { key: "ONE", label: "1 Star", stars: 1, color: "bg-rose-500" }
];

export default function FeedbackStats({ stats, themeColor = "#2563eb" }: FeedbackStatsProps) {
    const total = stats.totalFeedbacks || 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Rating Score Card */}
            <Card className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Average Rating
                    </span>
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Award className="w-4 h-4" />
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                        {[1, 2, 3, 4, 5].map(starNum => (
                            <Star
                                key={starNum}
                                className={`w-4 h-4 ${
                                    starNum <= Math.round(stats.averageRating)
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-slate-200 dark:text-slate-700"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <p className="text-[10px] text-slate-400 italic mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                    Based on {total} recorded {total === 1 ? "review" : "reviews"}
                </p>
            </Card>

            {/* CSAT Satisfaction Score Card */}
            <Card className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Citizen Satisfaction (CSAT)
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4" />
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {stats.csatPercentage}%
                        </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                        Positive Ratings (4★ & 5★)
                    </p>
                </div>

                <p className="text-[10px] text-slate-400 italic mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                    Municipal service benchmark
                </p>
            </Card>

            {/* Total Feedback Submissions Card */}
            <Card className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total Submissions
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <MessageSquareHeart className="w-4 h-4" />
                    </div>
                </div>

                <div className="pt-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {total}
                    </span>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                        Treasury Transactions Rated
                    </p>
                </div>

                <p className="text-[10px] text-slate-400 italic mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                    Real-time citizen engagement
                </p>
            </Card>

            {/* Rating Distribution Breakdown */}
            <Card className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-sm flex flex-col justify-center space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Rating Distribution
                </span>

                <div className="space-y-1">
                    {STAR_LEVELS.map(level => {
                        const count = stats.ratingCounts[level.key] || 0;
                        const percent = total > 0 ? (count / total) * 100 : 0;

                        return (
                            <div key={level.key} className="flex items-center gap-2 text-[10px]">
                                <span className="w-12 text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                    {level.stars} ★
                                </span>
                                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${level.color} rounded-full transition-all duration-500`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <span className="w-6 text-right font-mono text-slate-600 dark:text-slate-300 font-bold">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
