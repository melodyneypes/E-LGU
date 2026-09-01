"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MapPin,
    Phone,
    Compass,
    Calendar,
    CheckCircle2,
    XCircle,
    DollarSign,
    Sparkles,
    Globe
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
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import DocumentViewerModal from "@/app/admin/treasury/[id]/components/DocumentViewerModal";

export interface TourismDetail {
    id: string;
    name: string;
    category: string;
    description: string | null;
    address: string;
    entranceFee: string | null;
    bestTimeToVisit: string | null;
    contactNumber: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    googleMapsUrl: string | null;
    isPublished: boolean;
    barangay: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Props {
    tourismSpot: TourismDetail;
}

export default function TourismAdminDetailClient({ tourismSpot }: Props) {
    const router = useRouter();

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

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-6 md:p-10 transition-colors">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin/tourism" className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-slate-500">
                                        <Compass className="w-4 h-4" />
                                        Tourism Spots
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-bold text-slate-900 dark:text-white capitalize">
                                    {tourismSpot.name}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/admin/tourism")}
                        className="w-fit h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2b] hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold shadow-sm cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Spots
                    </Button>
                </div>

                {/* Hero / Cover Photo Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-200/50 dark:border-slate-800/80 shadow-2xl">
                    <div className="relative h-72 md:h-96 w-full group">
                        {tourismSpot.imageUrl ? (
                            <>
                                <Image
                                    src={tourismSpot.imageUrl}
                                    alt={tourismSpot.name}
                                    fill
                                    className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 ease-out cursor-pointer"
                                    priority
                                    onClick={() => handleOpenImage(tourismSpot.imageUrl, tourismSpot.name)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 text-slate-500 gap-3">
                                <Compass className="w-16 h-16 stroke-1 text-slate-600" />
                                <span className="text-sm font-semibold tracking-wider uppercase">No Cover Photo Uploaded</span>
                            </div>
                        )}

                        {/* Top Action Tags */}
                        <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-2 pointer-events-auto">
                                <Badge className="px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white font-extrabold uppercase text-xs tracking-wider border-0 shadow-lg">
                                    {tourismSpot.category || "Attraction"}
                                </Badge>
                                {tourismSpot.barangay && (
                                    <Badge className="px-3.5 py-1.5 rounded-xl bg-blue-600/90 backdrop-blur-md text-white font-bold uppercase text-xs tracking-wider border-0 shadow-lg">
                                        {tourismSpot.barangay}
                                    </Badge>
                                )}
                            </div>

                            <div className="pointer-events-auto">
                                {tourismSpot.isPublished ? (
                                    <Badge className="px-3.5 py-1.5 rounded-xl bg-emerald-500/90 text-white font-black uppercase text-xs tracking-wider border-0 shadow-lg flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Published
                                    </Badge>
                                ) : (
                                    <Badge className="px-3.5 py-1.5 rounded-xl bg-amber-500/90 text-white font-black uppercase text-xs tracking-wider border-0 shadow-lg flex items-center gap-1.5">
                                        <XCircle className="w-3.5 h-3.5" /> Draft / Hidden
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Title Over Banner */}
                        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tight drop-shadow-md">
                                    {tourismSpot.name}
                                </h1>
                                <p className="text-slate-200 text-sm md:text-base font-semibold flex items-center gap-2 drop-shadow">
                                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                                    {tourismSpot.address}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left 2 Cols: Details & Description */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description Card */}
                        <Card className="rounded-3xl border border-slate-200 dark:border-[#1e2538] bg-white dark:bg-[#121624] shadow-sm overflow-hidden">
                            <CardContent className="p-8 space-y-4">
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    About This Attraction
                                </h2>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                    {tourismSpot.description || "No detailed description provided for this tourism spot."}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Highlight Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Entrance Fee */}
                            <Card className="rounded-3xl border border-slate-200 dark:border-[#1e2538] bg-white dark:bg-[#121624] shadow-sm p-6 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Entrance Fee / Rates</h3>
                                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                            {tourismSpot.entranceFee || "Free Admission / Not Specified"}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Best Time to Visit */}
                            <Card className="rounded-3xl border border-slate-200 dark:border-[#1e2538] bg-white dark:bg-[#121624] shadow-sm p-6 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Best Time to Visit</h3>
                                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                            {tourismSpot.bestTimeToVisit || "All Year Round / Open Daily"}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Right 1 Col: Quick Info & Contacts */}
                    <div className="space-y-6">
                        <Card className="rounded-3xl border border-slate-200 dark:border-[#1e2538] bg-white dark:bg-[#121624] shadow-sm p-6 space-y-6">
                            <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                Location & Contact
                            </h2>

                            <div className="space-y-4 text-sm font-medium">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">Address</span>
                                        <span className="text-slate-800 dark:text-slate-200 font-semibold">{tourismSpot.address}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">Contact Number</span>
                                        <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                            {tourismSpot.contactNumber || "None Provided"}
                                        </span>
                                    </div>
                                </div>

                                {tourismSpot.googleMapsUrl && (
                                    <div className="pt-2">
                                        <a
                                            href={tourismSpot.googleMapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold transition-all text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-800/50"
                                        >
                                            <Globe className="w-4 h-4" /> Open in Google Maps
                                        </a>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Document / Image Viewer Modal */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                documents={viewerDocs}
                initialIndex={viewerIndex}
            />
        </div>
    );
}
