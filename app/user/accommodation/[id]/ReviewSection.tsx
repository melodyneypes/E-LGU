"use client";

import React from "react";
import Image from "next/image";
import { Star, MessageSquare, Send, User as UserIcon, Calendar, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { submitReviewAction } from "../../actions/reviews";
import { getSecureUploadUrlAction } from "@/app/auth/actions";
import { motion, AnimatePresence } from "framer-motion";

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    mediaUrl: string | null;
    createdAt: Date | string;
    user: {
        name: string | null;
        email: string | null;
        image?: string | null;
    };
}

interface ReviewSectionProps {
    targetId: string;
    targetType: "accommodation" | "dining";
    initialReviews: Review[];
    currentUserName?: string | null;
    currentUserEmail?: string | null;
    currentUserImage?: string | null;
}

type FilterType = "all" | "5" | "4" | "3_below" | "photos";

export function ReviewSection({
    targetId,
    targetType,
    initialReviews,
    currentUserName,
    currentUserEmail
}: ReviewSectionProps) {
    const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
    const [rating, setRating] = React.useState<number>(5);
    const [hoverRating, setHoverRating] = React.useState<number>(0);
    const [comment, setComment] = React.useState<string>("");
    const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);
    const [isUploading, setIsUploading] = React.useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
    const [activeLightboxUrl, setActiveLightboxUrl] = React.useState<string | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Calculate rating stats
    const stats = React.useMemo(() => {
        if (reviews.length === 0) return { average: 0, total: 0 };
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return {
            average: parseFloat((sum / reviews.length).toFixed(1)),
            total: reviews.length
        };
    }, [reviews]);

    // Check if current user has already reviewed
    const hasUserReviewed = React.useMemo(() => {
        if (!currentUserEmail) return false;
        return reviews.some(r => r.user.email === currentUserEmail);
    }, [reviews, currentUserEmail]);

    // Filter reviews list
    const filteredReviews = React.useMemo(() => {
        return reviews.filter((r) => {
            if (activeFilter === "all") return true;
            if (activeFilter === "5") return r.rating === 5;
            if (activeFilter === "4") return r.rating === 4;
            if (activeFilter === "3_below") return r.rating <= 3;
            if (activeFilter === "photos") return !!r.mediaUrl;
            return true;
        });
    }, [reviews, activeFilter]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Each image must be less than 5MB.");
            return;
        }

        if (mediaUrls.length >= 5) {
            toast.error("You can upload a maximum of 5 images.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Uploading image...");

        try {
            const fileExt = file.name.split(".").pop() || "jpg";
            const uploadRes = await getSecureUploadUrlAction("review_media", "reviews", fileExt);
            
            if (!uploadRes.success || !uploadRes.signedUrl || !uploadRes.publicUrl) {
                throw new Error(uploadRes.error || "Failed to generate upload destination");
            }

            const putRes = await fetch(uploadRes.signedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type
                },
                body: file
            });

            if (!putRes.ok) {
                throw new Error("Failed to upload image file to storage.");
            }

            setMediaUrls(prev => [...prev, uploadRes.publicUrl]);
            toast.success("Image uploaded successfully!", { id: toastId });
        } catch (err: any) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload image", { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setMediaUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserEmail) {
            toast.error("You must be logged in to leave a review.");
            return;
        }

        if (comment.length > 500) {
            toast.error("Review comments cannot exceed 500 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            const mediaUrlString = mediaUrls.length > 0 ? mediaUrls.join(",") : undefined;
            const res = await submitReviewAction(targetId, targetType, rating, comment, mediaUrlString);
            if (res.success) {
                toast.success("Thank you! Your review has been saved.");
                
                const newReview: Review = {
                    id: Math.random().toString(),
                    rating,
                    comment: comment || null,
                    mediaUrl: mediaUrlString || null,
                    createdAt: new Date(),
                    user: {
                        name: currentUserName || "Resident Member",
                        email: currentUserEmail
                    }
                };

                setReviews(prev => [newReview, ...prev]);
                setComment("");
                setMediaUrls([]);
            } else {
                toast.error(res.error || "Failed to submit review.");
            }
        } catch {
            toast.error("An error occurred while submitting your review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12 pt-12 mt-12 border-t border-slate-800">
            {/* Header / Stats Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="h-[2px] w-8 bg-primary rounded-full" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Reviews & Ratings</h3>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                        Visitor Feedback
                    </h2>
                </div>

                {stats.total > 0 && (
                    <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-xl px-6 py-4 rounded-[2rem] border border-slate-850 dark:border-white/5 shadow-xl w-fit">
                        <div className="text-center">
                            <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white italic leading-none">{stats.average}</span>
                            <span className="text-slate-550 font-bold text-xs italic">/5</span>
                        </div>
                        <div className="h-8 w-px bg-slate-800" />
                        <div>
                            <div className="flex gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            "w-4 h-4 fill-current",
                                            star <= Math.round(stats.average) ? "opacity-100 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" : "opacity-15 text-slate-650"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic mt-0.5 block">
                                {stats.total} {stats.total === 1 ? "Review" : "Reviews"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Submit Form Column */}
                <div className="lg:col-span-5 bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-slate-800/80 shadow-2xl relative overflow-hidden group space-y-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic">Write a Review</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">One review per user</p>
                    </div>

                    {!currentUserEmail ? (
                        <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
                            <UserIcon className="w-8 h-8 text-slate-700 mx-auto" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-none">Authentication Required</p>
                                <p className="text-[10px] font-bold text-slate-500 leading-normal uppercase italic mt-1">Please log in to submit a review and rating.</p>
                            </div>
                            <Button asChild size="sm" className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all">
                                <a href="/auth/login">Log In to Account</a>
                            </Button>
                        </div>
                    ) : hasUserReviewed ? (
                        <div className="p-6 border border-slate-800 rounded-2xl text-center space-y-4 bg-slate-955/40 shadow-inner">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-200 uppercase tracking-wider">Feedback Submitted</p>
                                <p className="text-[9px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest italic mt-1.5">
                                    You have already left your review for this establishment. Only one submission is allowed.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Star Selector */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Your Rating</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="transition-all hover:scale-125 focus:outline-none"
                                        >
                                            <Star
                                                className={cn(
                                                    "w-9 h-9 transition-all duration-300",
                                                    star <= (hoverRating || rating)
                                                        ? "fill-amber-455 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110"
                                                        : "text-slate-700 fill-transparent opacity-40 hover:opacity-70"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment Textarea */}
                            <div className="space-y-2 relative">
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="comment" className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Comments</label>
                                    <span className={cn("text-[9px] font-bold tracking-wider", comment.length > 450 ? "text-red-500 animate-pulse" : "text-slate-655")}>
                                        {comment.length} / 500
                                    </span>
                                </div>
                                <textarea
                                    id="comment"
                                    rows={4}
                                    maxLength={500}
                                    placeholder="Write your honest review here (max 500 characters)..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 text-xs font-semibold text-slate-100 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-slate-600 transition-all"
                                />
                            </div>

                            {/* Media Image Upload */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Add Photos (Max 5, 5MB each)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                
                                <div className="space-y-3">
                                    {/* Uploaded Images Grid */}
                                    {mediaUrls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {mediaUrls.map((url, idx) => (
                                                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-lg group/img cursor-zoom-in" onClick={() => setActiveLightboxUrl(url)}>
                                                    <Image src={url} alt={`Upload preview ${idx + 1}`} fill className="object-cover" unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveImage(idx);
                                                        }}
                                                        className="absolute top-2 right-2 bg-slate-950/80 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors z-20 border border-white/10"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    {mediaUrls.length < 5 && (
                                        <button
                                            type="button"
                                            disabled={isUploading}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-20 border border-dashed border-slate-800 hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-slate-950/20 text-slate-505 hover:text-primary transition-all active:scale-[0.98]"
                                        >
                                            <Upload className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                {isUploading ? "Uploading File..." : `Attach Snapshot (${mediaUrls.length}/5)`}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isSubmitting || isUploading}
                                className="w-full bg-primary hover:bg-primary/95 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 h-11 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {isSubmitting ? "Submitting..." : "Submit Review"}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Reviews List & Filters Column */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Review Filters Header */}
                    {reviews.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 bg-slate-900/30 p-2 border border-slate-850 rounded-2xl w-full">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 ml-2 mr-1">Filter By:</span>
                            {(["all", "5", "4", "3_below", "photos"] as FilterType[]).map((filter) => {
                                const count = reviews.filter((r) => {
                                    if (filter === "all") return true;
                                    if (filter === "5") return r.rating === 5;
                                    if (filter === "4") return r.rating === 4;
                                    if (filter === "3_below") return r.rating <= 3;
                                    if (filter === "photos") return !!r.mediaUrl;
                                    return true;
                                }).length;

                                let label = "";
                                if (filter === "all") label = "All";
                                else if (filter === "5") label = "5 ★";
                                else if (filter === "4") label = "4 ★";
                                else if (filter === "3_below") label = "3★ & below";
                                else if (filter === "photos") label = "Photos";

                                return (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setActiveFilter(filter)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl font-black uppercase tracking-wider text-[8px] transition-all flex items-center gap-1 active:scale-95",
                                            activeFilter === filter
                                                ? "bg-primary text-white shadow-md shadow-primary/10"
                                                : "bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800/40 hover:border-slate-800"
                                        )}
                                    >
                                        {label}
                                        <span className={cn("text-[7px] font-bold px-1.5 py-0.5 rounded-full", activeFilter === filter ? "bg-white/20 text-white" : "bg-slate-900 text-slate-500")}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Reviews List */}
                    <AnimatePresence mode="popLayout" initial={false}>
                        {filteredReviews.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center p-16 bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-[2.5rem] text-center shadow-md"
                            >
                                <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider italic">No Matching Feedback</h5>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                                    {activeFilter === "photos" ? "No reviews contain uploaded photos." : "No reviews match your selected filter."}
                                </p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
                                {filteredReviews.map((review) => (
                                    <motion.div
                                        key={review.id}
                                        layout
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-[2rem] shadow-lg hover:border-slate-700/80 transition-all duration-300 space-y-4 group/card relative"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            {/* User Bio */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0 text-primary font-black text-sm uppercase shadow-inner">
                                                    {review.user.name ? review.user.name.charAt(0) : "R"}
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-xs font-black text-slate-200 uppercase tracking-wide group-hover/card:text-white transition-colors">
                                                        {review.user.name || "Resident Member"}
                                                    </span>
                                                    <span className="text-[8px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-2.5 h-2.5" />
                                                        {new Date(review.createdAt).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Review Rating Stars */}
                                            <div className="flex gap-0.5 text-amber-400">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "w-3 h-3 fill-current",
                                                            star <= review.rating ? "opacity-100 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]" : "opacity-15 text-slate-655"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {review.comment && (
                                            <p className="text-xs text-slate-350 font-medium italic leading-relaxed pl-3 border-l-2 border-primary/30 py-0.5">
                                                &ldquo;{review.comment}&rdquo;
                                            </p>
                                        )}

                                        {/* Image attachment rendering */}
                                        {review.mediaUrl && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
                                                {review.mediaUrl.split(",").map((url, idx) => (
                                                    <div key={idx} onClick={() => setActiveLightboxUrl(url)} className="relative aspect-video rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-800 group/img-view cursor-zoom-in">
                                                        <Image
                                                            src={url}
                                                            alt={`Review photo ${idx + 1}`}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover/img-view:scale-105"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {/* Image Lightbox Modal */}
            <AnimatePresence>
                {activeLightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveLightboxUrl(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
                    >
                        <button
                            onClick={() => setActiveLightboxUrl(null)}
                            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-55"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="relative max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={activeLightboxUrl!}
                                alt="Full size preview"
                                width={1200}
                                height={800}
                                className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl"
                                unoptimized
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
