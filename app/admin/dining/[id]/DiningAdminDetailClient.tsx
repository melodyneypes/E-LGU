"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MapPin,
    Clock,
    Phone,
    Globe,
    Star,
    Utensils,
    Calendar,
    MessageSquare,
    CheckCircle2,
    XCircle,
    Eye,
    TrendingUp,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import DocumentViewerModal from "@/app/admin/treasury/[id]/components/DocumentViewerModal";

interface ReviewUser {
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
}

interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    mediaUrl: string | null;
    createdAt: Date | string;
    user: ReviewUser;
}

export interface DiningDetail {
    id: string;
    name: string;
    description: string | null;
    address: string;
    cuisineType: string | null;
    openingHours: string | null;
    contactNumber: string | null;
    facebookUrl: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    googleMapsUrl: string | null;
    isPublished: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    barangay: string | null;
    reviews: ReviewItem[];
}

export interface Props {
    dining: DiningDetail;
}

export function DiningAdminDetailClient({ dining }: Props) {
    const router = useRouter();
    const [selectedStarFilter, setSelectedStarFilter] = useState<number | "ALL">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Document / Image preview modal state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const handleOpenImage = (url: string | null, title: string) => {
        if (!url) return;
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    const reviews = useMemo(() => dining.reviews || [], [dining.reviews]);
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

    // Filter reviews
    const filteredReviews = useMemo(() => {
        return reviews.filter((r) => {
            const matchesStar = selectedStarFilter === "ALL" || r.rating === selectedStarFilter;
            const authorName = r.user?.residentProfile?.firstName
                ? `${r.user.residentProfile.firstName} ${r.user.residentProfile.lastName || ""}`
                : (r.user?.name || "");
            const matchesSearch =
                !searchQuery.trim() ||
                (r.comment && r.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
                authorName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStar && matchesSearch;
        });
    }, [reviews, selectedStarFilter, searchQuery]);

    // Map implementation
    const mapQuery = dining.latitude && dining.longitude
        ? `${dining.latitude},${dining.longitude}`
        : `${dining.name}, ${dining.address}, Mapandan, Pangasinan`;
    const publicMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] pb-24 text-slate-900 dark:text-slate-100">
            {/* Top Navigation Bar / Breadcrumb */}
            <div className="border-b border-slate-200 dark:border-[#2a3040] bg-white/80 dark:bg-[#151b28]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push("/admin/dining")}
                            className="rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 h-10 w-10 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link href="/admin/dining" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary">
                                                Dining Management
                                            </Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-xs font-black uppercase tracking-wider text-primary truncate max-w-[200px] sm:max-w-[300px]">
                                            {dining.name}
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white truncate max-w-[320px] sm:max-w-[500px]">
                                {dining.name}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {dining.isPublished ? (
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
                        <Link href={`/user/dining/${dining.id}`} target="_blank">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-slate-200 dark:border-white/10 font-bold text-xs gap-1.5 hidden sm:flex"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Resident View
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
                {/* Hero Showcase Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Restaurant Cover & Basic Details */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="relative aspect-[21/9] sm:aspect-[2/1] w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl group">
                            {dining.imageUrl ? (
                                <Image
                                    src={dining.imageUrl}
                                    alt={dining.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                                    onClick={() => handleOpenImage(dining.imageUrl, dining.name)}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 dark:bg-slate-800 gap-2">
                                    <Utensils className="w-12 h-12" />
                                    <span className="text-xs font-bold uppercase tracking-widest">No Cover Photo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4 pointer-events-none">
                                <div className="space-y-2 pointer-events-auto">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-wider">
                                            {dining.cuisineType || "General Dining"}
                                        </Badge>
                                        {dining.barangay && (
                                            <Badge variant="outline" className="bg-white/20 backdrop-blur-md text-white border-white/30 font-bold text-[10px] uppercase tracking-wider">
                                                Brgy. {dining.barangay}
                                            </Badge>
                                        )}
                                    </div>
                                    <h2 className="text-2xl sm:text-4xl font-black text-white uppercase italic tracking-tight drop-shadow-md">
                                        {dining.name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Description & Overview Card */}
                        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28]">
                            <CardContent className="p-6 sm:p-8 space-y-6">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Establishment Overview
                                    </h3>
                                    <p className="mt-2 text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {dining.description || "No description provided for this dining establishment."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Address & Location</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{dining.address}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Opening Hours</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{dining.openingHours || "Not Specified"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact Number</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{dining.contactNumber || "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Social Page / Link</p>
                                            {dining.facebookUrl ? (
                                                <a
                                                    href={dining.facebookUrl.startsWith("http") ? dining.facebookUrl : `https://${dining.facebookUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-primary hover:underline truncate block max-w-[200px]"
                                                >
                                                    Facebook Page ➔
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
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] overflow-hidden">
                            <div className="p-6 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-100 dark:border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        Citizen Ratings
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-black italic tracking-tight text-slate-900 dark:text-white">
                                        {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                                    </span>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-amber-500">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${
                                                        star <= Math.round(averageRating)
                                                            ? "fill-amber-500 text-amber-500"
                                                            : "text-slate-300 dark:text-slate-700"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Out of 5.0 Stars
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Histogram Distribution Bars */}
                            <CardContent className="p-6 space-y-3">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = distribution[star] || 0;
                                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    const isSelected = selectedStarFilter === star;

                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setSelectedStarFilter(isSelected ? "ALL" : star)}
                                            className={`w-full flex items-center gap-3 p-1.5 rounded-xl text-left transition-all group ${
                                                isSelected
                                                    ? "bg-amber-500/10 border border-amber-500/30"
                                                    : "hover:bg-slate-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 w-12 shrink-0">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{star}</span>
                                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            </div>

                                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>

                                            <span className="text-xs font-bold text-slate-400 w-8 text-right shrink-0">
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
                                        className="w-full text-xs text-primary font-black uppercase tracking-wider mt-2"
                                    >
                                        Clear Star Filter
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Interactive Google Map Preview */}
                        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Location Map
                                </span>
                                {dining.googleMapsUrl && (
                                    <a
                                        href={dining.googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                        Google Maps ➔
                                    </a>
                                )}
                            </div>
                            <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-900 relative">
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
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Citizen Reviews & Comments
                                </h2>
                                <p className="text-xs text-slate-400 font-medium">
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
                                className="h-10 px-4 rounded-xl text-xs bg-white dark:bg-[#151b28] border border-slate-200 dark:border-white/10 font-medium focus:ring-primary focus:border-primary shadow-sm"
                            />
                        </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                        <Card className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center bg-white/50 dark:bg-white/[0.02]">
                            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 uppercase">No Reviews Found</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                {totalReviews === 0
                                    ? "This restaurant has not received any citizen reviews yet."
                                    : "No reviews match your selected star rating or search query."}
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                        className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#151b28] flex flex-col justify-between overflow-hidden hover:border-primary/40 transition-all group"
                                    >
                                        <CardContent className="p-6 space-y-4 flex-1">
                                            {/* Review Author Header */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-white/10">
                                                        {avatarUrl ? (
                                                            <Image src={avatarUrl} alt={authorName} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs uppercase">
                                                                {authorName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">
                                                                {authorName}
                                                            </h4>
                                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                        </div>
                                                        {barangay && (
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                                                Brgy. {barangay}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {dateFormatted}
                                                </span>
                                            </div>

                                            {/* Star Rating Display */}
                                            <div className="flex items-center gap-1">
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
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 ml-1.5">
                                                    {review.rating}.0
                                                </span>
                                            </div>

                                            {/* Review Comment Text */}
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                                                {review.comment ? `“${review.comment}”` : <span className="text-slate-400 not-italic">No written comment provided.</span>}
                                            </p>

                                            {/* Review Media Attachment */}
                                            {review.mediaUrl && (
                                                <div className="pt-2">
                                                    <div
                                                        onClick={() => handleOpenImage(review.mediaUrl, `${authorName}'s Review Photo`)}
                                                        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 cursor-zoom-in group/img"
                                                    >
                                                        <Image
                                                            src={review.mediaUrl}
                                                            alt="Review attachment"
                                                            fill
                                                            className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                                                                Zoom Photo
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* High-res Image Zoom Modal */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="#2563eb"
            />
        </div>
    );
}

export default DiningAdminDetailClient;
