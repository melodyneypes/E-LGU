"use client";

import React, { useState } from "react";
import { Star, MessageSquareHeart, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { submitTransactionFeedbackAction } from "@/app/user/actions/feedback";

type RatingKey = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

interface RatingOption {
    key: RatingKey;
    value: number;
    label: string;
}

const RATING_OPTIONS: RatingOption[] = [
    { key: "ONE", value: 1, label: "Poor" },
    { key: "TWO", value: 2, label: "Fair" },
    { key: "THREE", value: 3, label: "Good" },
    { key: "FOUR", value: 4, label: "Great" },
    { key: "FIVE", value: 5, label: "Outstanding" }
];

const RATING_TO_NUM: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
};

export default function TransactionFeedbackCard({
    transactionId,
    existingFeedback,
    themeColor = "#0038a8",
    onFeedbackSubmitted
}: {
    transactionId: string;
    existingFeedback?: any;
    themeColor?: string;
    onFeedbackSubmitted?: (feedback: any) => void;
}) {
    const [selectedRating, setSelectedRating] = useState<RatingKey | null>(null);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackData, setFeedbackData] = useState<any>(existingFeedback || null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRating) {
            toast.error("Please click on a star to select a rating.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitTransactionFeedbackAction({
                transactionId,
                rating: selectedRating,
                comment: comment.trim()
            });

            if (res.success && res.data) {
                setFeedbackData(res.data);
                if (onFeedbackSubmitted) {
                    onFeedbackSubmitted(res.data);
                }
                toast.success(res.message || "Thank you for rating your experience!");
            } else {
                toast.error(res.error || "Failed to submit feedback.");
            }
        } catch {
            toast.error("An unexpected error occurred while submitting feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // If feedback has been submitted, render compact read-only thank-you card
    if (feedbackData) {
        const numericRating = RATING_TO_NUM[feedbackData.rating] || 5;
        const ratingConfig = RATING_OPTIONS.find(r => r.key === feedbackData.rating) || RATING_OPTIONS[4];

        return (
            <Card className="p-4 md:p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] dark:bg-cyan-500/[0.06] shadow-md relative overflow-hidden space-y-2.5 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Citizen Rating Recorded
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(starNum => (
                                <Star
                                    key={starNum}
                                    className={cn(
                                        "w-3.5 h-3.5",
                                        starNum <= numericRating
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-slate-300 dark:text-slate-700"
                                    )}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] font-black uppercase text-amber-500">
                            {ratingConfig.label} ({numericRating}/5)
                        </span>
                    </div>
                </div>

                {/* Direct comment text without redundant card box wrapper */}
                {feedbackData.comment && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed pl-8 border-l-2 border-cyan-500/30 py-0.5">
                        &ldquo;{feedbackData.comment}&rdquo;
                    </p>
                )}

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium italic pt-1 border-t border-cyan-500/10">
                    <span>Thank you for helping us improve our public services.</span>
                    <span className="font-mono text-slate-400 shrink-0 ml-2">
                        {new Date(feedbackData.createdAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                        })}
                    </span>
                </div>
            </Card>
        );
    }

    // Interactive Citizen Rating Form
    const currentActiveRating = hoverRating || (selectedRating ? RATING_TO_NUM[selectedRating] : 0);
    const activeRatingOption = RATING_OPTIONS.find(r => r.value === currentActiveRating);

    return (
        <Card className="p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-xl relative overflow-hidden space-y-4 animate-in fade-in duration-500">
            {/* Ambient subtle decorative background element */}
            <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ backgroundColor: themeColor }}
            />

            {/* Header */}
            <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <MessageSquareHeart className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                            Rate Your Experience
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Your transaction has been released. Please take a moment to rate our municipal service.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* 5-Star Interactive Rating Selector */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {RATING_OPTIONS.map(option => {
                            const isFilled = option.value <= currentActiveRating;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSelectedRating(option.key)}
                                    onMouseEnter={() => setHoverRating(option.value)}
                                    onMouseLeave={() => setHoverRating(null)}
                                    className="p-1 rounded-xl hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none"
                                    title={option.label}
                                >
                                    <Star
                                        className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-150",
                                            isFilled
                                                ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                                : "text-slate-300 dark:text-slate-600 hover:text-amber-300"
                                        )}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                        {activeRatingOption ? `${activeRatingOption.label} (${activeRatingOption.value}/5)` : "Tap a star to rate"}
                    </span>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>Comments or Suggestions (Optional)</span>
                        <span className="text-[9px] font-mono text-slate-400">{comment.length}/500</span>
                    </div>
                    <Textarea
                        value={comment}
                        onChange={e => setComment(e.target.value.slice(0, 500))}
                        placeholder="Tell us what you liked or how we can improve..."
                        className="min-h-[80px] rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-blue-500 resize-none"
                    />
                </div>

                {/* Submit Action */}
                <Button
                    type="submit"
                    disabled={isSubmitting || !selectedRating}
                    className="w-full h-11 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-[0.99] cursor-pointer"
                    style={{ backgroundColor: themeColor }}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                            Submitting Feedback...
                        </>
                    ) : (
                        "Submit Citizen Feedback"
                    )}
                </Button>
            </form>
        </Card>
    );
}
