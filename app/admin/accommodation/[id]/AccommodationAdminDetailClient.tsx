"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MapPin,
    Phone,
    Globe,
    Star,
    BedDouble,
    Calendar,
    MessageSquare,
    CheckCircle2,
    XCircle,
    TrendingUp,
    ShieldCheck,
    Trash2,
    DollarSign,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { deleteReviewAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import DocumentViewerModal from "@/app/admin/treasury/[id]/components/DocumentViewerModal";

export interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    mediaUrl: string | null;
    createdAt: Date | string;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        image?: string | null;
        residentProfile?: {
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
            barangay: string | null;
        } | null;
    } | null;
}

export interface AccommodationDetail {
    id: string;
    name: string;
    description: string | null;
    address: string;
    type: string;
    priceRange: string | null;
    amenities: string | null;
    contactNumber: string | null;
    websiteUrl: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    googleMapsUrl: string | null;
    isPublished: boolean;
    barangay: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    reviews: ReviewItem[];
}

export interface Props {
    accommodation: AccommodationDetail;
}

export function AccommodationAdminDetailClient({ accommodation }: Props) {
    const router = useRouter();
    const [reviewsList, setReviewsList] = useState<ReviewItem[]>(accommodation.reviews || []);
    const [selectedStarFilter, setSelectedStarFilter] = useState<number | "ALL">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    // Debounce search input by 400ms
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Delete review state
    const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
    const [isDeletingReview, setIsDeletingReview] = useState(false);

    // Sync reviewsList if server prop updates
    React.useEffect(() => {
        setReviewsList(accommodation.reviews || []);
    }, [accommodation.reviews]);

    // Document / Image preview modal state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [viewerDocs, setViewerDocs] = useState<{ url?: string | null; label: string }[]>([]);
    const [viewerIndex, setViewerIndex] = useState<number>(0);

    const handleOpenImage = (url: string | null, title: string) => {
        if (!url) return;
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerDocs([{ url, label: title }]);
        setViewerIndex(0);
        setViewerOpen(true);
    };

    const handleOpenGallery = (imageUrls: string[], title: string, startIndex: number = 0) => {
        if (!imageUrls || imageUrls.length === 0) return;
        const docs = imageUrls.map((url, idx) => ({
            url,
            label: `${title} (${idx + 1} of ${imageUrls.length})`
        }));
        setViewerDocs(docs);
        setViewerIndex(startIndex);
        setViewerUrl(imageUrls[startIndex] || imageUrls[0]);
        setViewerTitle(docs[startIndex]?.label || title);
        setViewerOpen(true);
    };

    const handleDeleteReview = async () => {
        if (!reviewToDelete) return;
        setIsDeletingReview(true);
        try {
            const res = await deleteReviewAction(reviewToDelete.id);
            if (res.success) {
                toast.success("Citizen review & rating deleted successfully! 🗑️");
                setReviewsList((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
                setReviewToDelete(null);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete review.");
            }
        } catch (err: any) {
            console.error("Error deleting review:", err);
            toast.error("An unexpected error occurred while deleting the review.");
        } finally {
            setIsDeletingReview(false);
        }
    };

    const reviews = useMemo(() => reviewsList || [], [reviewsList]);
    const totalReviews = reviews.length;

    // Calculate rating metrics
    const averageRating = useMemo(() => {
        if (totalReviews === 0) return 0;
        const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        return parseFloat((sum / totalReviews).toFixed(1));
    }, [reviews, totalReviews]);

    // Calculate distribution counts
    const distribution = useMemo(() => {
        const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => {
            if (counts[r.rating] !== undefined) counts[r.rating]++;
        });
        return counts;
    }, [reviews]);

    // Filter reviews using debounced query
    const filteredReviews = useMemo(() => {
        return reviews.filter((r) => {
            const matchesStar = selectedStarFilter === "ALL" || r.rating === selectedStarFilter;
            const authorName = r.user?.residentProfile?.firstName
                ? `${r.user.residentProfile.firstName} ${r.user.residentProfile.lastName || ""}`
                : (r.user?.name || "");
            const matchesSearch =
                !debouncedSearchQuery.trim() ||
                (r.comment && r.comment.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
                authorName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            return matchesStar && matchesSearch;
        });
    }, [reviews, selectedStarFilter, debouncedSearchQuery]);

    // Map implementation
    const mapQuery = accommodation.latitude && accommodation.longitude
        ? `${accommodation.latitude},${accommodation.longitude}`
        : `${accommodation.name}, ${accommodation.address}, Mapandan, Pangasinan`;
    const publicMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    // Parse amenities into tags
    const amenitiesList = useMemo(() => {
        if (!accommodation.amenities) return [];
        return accommodation.amenities.split(",").map(a => a.trim()).filter(Boolean);
    }, [accommodation.amenities]);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] pb-16 text-slate-900 dark:text-slate-100">
            {/* Top Navigation Bar / Breadcrumb */}
            <div className="border-b border-slate-200 dark:border-[#2a3040] bg-white/80 dark:bg-[#151b28]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push("/admin/accommodation")}
                            className="rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 h-9 w-9 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/admin/accommodation" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary">
                                            Accommodation Management
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-xs font-black uppercase tracking-wider text-primary truncate max-w-[240px] sm:max-w-[360px]">
                                        {accommodation.name}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="flex items-center gap-3">
                        {accommodation.isPublished ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active / Published
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                Draft / Inactive
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
                {/* Hero Showcase Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Property Cover & Basic Details */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg group">
                            {accommodation.imageUrl ? (
                                <Image
                                    src={accommodation.imageUrl}
                                    alt={accommodation.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                                    onClick={() => handleOpenImage(accommodation.imageUrl, accommodation.name)}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 dark:bg-slate-800 gap-2">
                                    <BedDouble className="w-10 h-10" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Cover Photo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
                                <div className="space-y-1.5 pointer-events-auto">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase tracking-wider">
                                            {accommodation.type || "General Accommodation"}
                                        </Badge>
                                        {accommodation.barangay && (
                                            <Badge variant="outline" className="bg-white/20 backdrop-blur-md text-white border-white/30 font-bold text-[9px] uppercase tracking-wider">
                                                Brgy. {accommodation.barangay}
                                            </Badge>
                                        )}
                                    </div>
                                    <h2 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tight drop-shadow-md">
                                        {accommodation.name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Description & Overview Card */}
                        <Card className="rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28]">
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Property Overview
                                    </h3>
                                    <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {accommodation.description || "No description provided for this accommodation."}
                                    </p>
                                </div>

                                {/* Amenities Tags if available */}
                                {amenitiesList.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                                        <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                            Featured Amenities
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {amenitiesList.map((amenity, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5"
                                                >
                                                    ✓ {amenity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Address & Location</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{accommodation.address}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Price Range</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{accommodation.priceRange || "Contact for Rates"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contact Number</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{accommodation.contactNumber || "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Website / Social Page</p>
                                            {accommodation.websiteUrl ? (
                                                <a
                                                    href={accommodation.websiteUrl.startsWith("http") ? accommodation.websiteUrl : `https://${accommodation.websiteUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-primary hover:underline truncate block max-w-[200px]"
                                                >
                                                    Official Link ➔
                                                </a>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400">None</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Interactive Ratings & Reviews Scorecard */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card className="rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] overflow-hidden">
                            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-100 dark:border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <TrendingUp className="w-3 h-3" />
                                        Citizen Ratings
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-black italic tracking-tight text-slate-900 dark:text-white">
                                        {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                                    </span>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 text-amber-500">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-3.5 h-3.5 ${
                                                        star <= Math.round(averageRating)
                                                            ? "fill-amber-500 text-amber-500"
                                                            : "text-slate-300 dark:text-slate-700"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            Out of 5.0 Stars
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Histogram Distribution Bars */}
                            <CardContent className="p-4 space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = distribution[star] || 0;
                                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    const isSelected = selectedStarFilter === star;

                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setSelectedStarFilter(isSelected ? "ALL" : star)}
                                            className={`w-full flex items-center gap-2.5 p-1 rounded-lg text-left transition-all group ${
                                                isSelected
                                                    ? "bg-amber-500/10 border border-amber-500/30"
                                                    : "hover:bg-slate-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 w-10 shrink-0">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{star}</span>
                                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                            </div>

                                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>

                                            <span className="text-[11px] font-bold text-slate-400 w-6 text-right shrink-0">
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}

                                {selectedStarFilter !== "ALL" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedStarFilter("ALL")}
                                        className="w-full text-[10px] text-primary font-black uppercase tracking-wider mt-1 h-7"
                                    >
                                        Clear Star Filter
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Interactive Google Map Preview */}
                        <Card className="rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Location Map
                                </span>
                                {accommodation.googleMapsUrl && (
                                    <a
                                        href={accommodation.googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-bold text-primary hover:underline"
                                    >
                                        Google Maps ➔
                                    </a>
                                )}
                            </div>
                            <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900 relative">
                                <iframe
                                    src={publicMapUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen={false}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="w-full h-full"
                                />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Reviews & Citizen Feedback Section */}
                <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#2a3040] pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Citizen Reviews & Comments
                                </h2>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Showing {filteredReviews.length} of {totalReviews} feedback records
                                </p>
                            </div>
                        </div>

                        {/* Search & Filter pills */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search comments or citizen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 px-3 rounded-xl text-xs bg-white dark:bg-[#151b28] border border-slate-200 dark:border-white/10 font-medium focus:ring-primary focus:border-primary shadow-sm"
                            />
                        </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                        <Card className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-10 text-center bg-white/50 dark:bg-white/[0.02]">
                            <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">No Reviews Found</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                {totalReviews === 0
                                    ? "This property has not received any citizen reviews yet."
                                    : "No reviews match your selected star rating or search query."}
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredReviews.map((review) => {
                                const authorName = review.user?.residentProfile?.firstName
                                    ? `${review.user.residentProfile.firstName} ${review.user.residentProfile.lastName || ""}`
                                    : (review.user?.name || "Verified Citizen");
                                const avatarUrl = review.user?.residentProfile?.imageUrl || review.user?.image;
                                const barangay = review.user?.residentProfile?.barangay;
                                const dateFormatted = new Date(review.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                });

                                return (
                                    <Card
                                        key={review.id}
                                        className="rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] flex flex-col justify-between overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group"
                                    >
                                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                            <div className="space-y-2.5">
                                                {/* Review Author Header */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-white/10">
                                                            {avatarUrl ? (
                                                                <Image src={avatarUrl} alt={authorName} fill className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-[10px] uppercase">
                                                                    {authorName.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1">
                                                                <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">
                                                                    {authorName}
                                                                </h4>
                                                                <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                                            </div>
                                                            {barangay && (
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                                                    Brgy. {barangay}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                                                            <Calendar className="w-2.5 h-2.5" />
                                                            {dateFormatted}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewToDelete(review)}
                                                            title="Delete Citizen Review & Rating"
                                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Star Rating Display */}
                                                <div className="flex items-center gap-1">
                                                    <div className="flex items-center gap-0.5 text-amber-500">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-3.5 h-3.5 ${
                                                                    star <= review.rating
                                                                        ? "fill-amber-500 text-amber-500"
                                                                        : "text-slate-200 dark:text-slate-700"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 ml-1">
                                                        {review.rating}.0
                                                    </span>
                                                </div>

                                                {/* Review Comment Text */}
                                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-4 italic">
                                                    {review.comment ? `“${review.comment}”` : <span className="text-slate-400 not-italic text-[11px]">No written comment provided.</span>}
                                                </p>
                                            </div>

                                            {/* Review Media Attachment - Full Width Compact Banner Thumbnail */}
                                            {(() => {
                                                if (!review.mediaUrl) return null;
                                                const mediaList = review.mediaUrl
                                                    .split(",")
                                                    .map(u => u.trim())
                                                    .filter(Boolean);
                                                if (mediaList.length === 0) return null;
                                                const firstImage = mediaList[0];
                                                const totalImages = mediaList.length;

                                                return (
                                                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 w-full">
                                                        <div
                                                            onClick={() => handleOpenGallery(mediaList, `${authorName}'s Review Photos`)}
                                                            className="relative aspect-[2.4/1] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 cursor-zoom-in group/img hover:border-primary/60 transition-all"
                                                        >
                                                            <Image
                                                                src={firstImage}
                                                                alt="Review attachment"
                                                                fill
                                                                className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-white bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                                                    View Gallery ({totalImages})
                                                                </span>
                                                            </div>
                                                            {totalImages > 1 && (
                                                                <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1 shadow-sm">
                                                                    <span>📷</span>
                                                                    <span>+{totalImages - 1} photos</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Review Confirmation Modal */}
            {reviewToDelete && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 w-full max-w-md p-7 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold text-xl shrink-0">
                                🗑️
                            </div>
                            <div>
                                <h3 className="text-base font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                                    Delete Citizen Review?
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    Are you sure you want to remove this rating & feedback?
                                </p>
                            </div>
                        </div>

                        {/* Review Preview Card inside Dialog */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-500">Citizen:</span>
                                <span className="font-black text-slate-900 dark:text-white uppercase">
                                    {reviewToDelete.user?.residentProfile?.firstName
                                        ? `${reviewToDelete.user.residentProfile.firstName} ${reviewToDelete.user.residentProfile.lastName || ""}`
                                        : (reviewToDelete.user?.name || "Verified Citizen")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-500">Rating:</span>
                                <span className="font-black text-amber-500 font-mono flex items-center gap-1">
                                    {reviewToDelete.rating}.0 ★
                                </span>
                            </div>
                            {reviewToDelete.comment && (
                                <div className="border-t border-dashed border-slate-200 dark:border-white/5 pt-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Comment</span>
                                    <p className="italic text-slate-600 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                                        “{reviewToDelete.comment}”
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setReviewToDelete(null)}
                                disabled={isDeletingReview}
                                className="flex-1 rounded-xl border-slate-200 dark:border-white/10 font-bold py-6 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleDeleteReview}
                                disabled={isDeletingReview}
                                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-wider py-6 shadow-lg shadow-rose-600/20"
                            >
                                {isDeletingReview ? "Deleting..." : "Confirm Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* High-res Image / Multi-Photo Gallery Modal */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="#2563eb"
                documents={viewerDocs}
                initialIndex={viewerIndex}
            />
        </div>
    );
}

export default AccommodationAdminDetailClient;
