"use client";

import React from "react";
import {
    Star,
    ExternalLink,
    FileText,
    Receipt,
    Calendar,
    MessageSquareQuote
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface BploFeedbackDetailModalProps {
    feedback: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    themeColor?: string;
}

const RATING_MAP: Record<string, { label: string; num: number; color: string; desc: string }> = {
    FIVE: { label: "Outstanding", num: 5, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", desc: "Exceptional business permit licensing experience" },
    FOUR: { label: "Great", num: 4, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", desc: "Efficient and friendly BPLO service" },
    THREE: { label: "Good", num: 3, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", desc: "Satisfactory permit processing" },
    TWO: { label: "Fair", num: 2, color: "text-orange-500 bg-orange-500/10 border-orange-500/20", desc: "Acceptable but room for process streamlining" },
    ONE: { label: "Poor", num: 1, color: "text-rose-500 bg-rose-500/10 border-rose-500/20", desc: "Taxpayer experienced delays or issues" }
};

export default function BploFeedbackDetailModal({
    feedback,
    open,
    onOpenChange,
    themeColor = "#2563eb"
}: BploFeedbackDetailModalProps) {
    const router = useRouter();
    if (!feedback) return null;

    const ratingInfo = RATING_MAP[feedback.rating] || RATING_MAP.FIVE;
    const profile = feedback.user?.residentProfile;
    const citizenName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : feedback.user?.name || "Verified Taxpayer";
    const serviceName =
        feedback.transactionType?.name ||
        feedback.transaction?.type?.name ||
        "Business Permit";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={true}
                className="max-w-lg p-0 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] shadow-2xl"
            >
                {/* Header with Citizen Name as Title */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 relative overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                    <div
                        className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-10 pointer-events-none"
                        style={{ backgroundColor: themeColor }}
                    />
                    <DialogHeader className="space-y-2 text-left">
                        <div className="flex items-center justify-between">
                            <Badge
                                variant="outline"
                                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${ratingInfo.color}`}
                            >
                                {ratingInfo.label} ({ratingInfo.num}/5)
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(feedback.createdAt).toLocaleTimeString("en-PH", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true
                                })}
                            </span>
                        </div>
                        <DialogTitle className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {citizenName}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                                Recorded on{" "}
                                {new Date(feedback.createdAt).toLocaleDateString("en-PH", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric"
                                })}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Rating Given Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Rating Given
                            </span>
                            <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map(starNum => (
                                    <Star
                                        key={starNum}
                                        className={`w-5 h-5 ${
                                            starNum <= ratingInfo.num
                                                ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                                : "text-slate-300 dark:text-slate-700"
                                        }`}
                                    />
                                ))}
                                <span className="ml-2 text-sm font-black text-slate-800 dark:text-slate-200">
                                    {ratingInfo.num} / 5
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Auto-Adjusting Citizen Comments Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                            <MessageSquareQuote className="w-4 h-4 text-primary" />
                            <span>Taxpayer Remarks / Suggestions</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                            {feedback.comment ? (
                                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 italic leading-relaxed whitespace-pre-wrap break-words">
                                    &ldquo;{feedback.comment}&rdquo;
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 italic">
                                    No written remarks provided for this rating.
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Transaction Context */}
                    <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            Permit Transaction Reference
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Service</span>
                                </div>
                                <p className="font-black text-slate-900 dark:text-white uppercase truncate">
                                    {serviceName}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Queue Ticket / Status</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                        {feedback.transaction?.queueNumber ? `#${feedback.transaction.queueNumber}` : "N/A"}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                        {feedback.transaction?.status || "RELEASED"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl text-xs cursor-pointer"
                    >
                        Close
                    </Button>

                    {feedback.transaction?.id && (
                        <Button
                            size="sm"
                            onClick={() => {
                                onOpenChange(false);
                                router.push(`/admin/bplo/${feedback.transaction.id}`);
                            }}
                            className="rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                            style={{ backgroundColor: themeColor }}
                        >
                            <span>Open Permit</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
