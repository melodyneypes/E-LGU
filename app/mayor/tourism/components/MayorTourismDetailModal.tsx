"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
    Compass,
    MapPin,
    Phone,
    Clock,
    Ticket,
    Globe,
    CheckCircle2,
    XCircle,
    Calendar,
    Navigation,
} from "lucide-react";

export interface TourismDetailItem {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    address: string;
    entranceFee?: string | null;
    bestTimeToVisit?: string | null;
    contactNumber?: string | null;
    imageUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    barangay: string | null;
    isPublished: boolean;
    createdAt: string;
}

interface MayorTourismDetailModalProps {
    item: TourismDetailItem | null;
    onClose: () => void;
}

export function MayorTourismDetailModal({ item, onClose }: MayorTourismDetailModalProps) {
    useEffect(() => {
        if (!item) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [item, onClose]);

    if (!item) return null;

    const mapQuery = item.latitude && item.longitude
        ? `${item.latitude},${item.longitude}`
        : `${item.name}, ${item.address || ''}, Mapandan, Pangasinan`;
    const mapIframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner / Photo */}
                <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-[#1e2330]">
                    {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Compass size={40} className="mb-2" />
                            <span className="text-xs font-bold uppercase tracking-wider">No Photo Available</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                    <div className="absolute bottom-4 left-6 right-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                {item.category || "Tourism Spot"}
                            </span>
                            {item.isPublished ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                    <CheckCircle2 size={12} /> Published
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/90 backdrop-blur-md text-slate-300 text-[10px] font-black uppercase italic tracking-widest shadow">
                                    <XCircle size={12} /> Draft
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight drop-shadow-md">
                            {item.name}
                        </h2>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar pr-3">
                    {item.description && (
                        <div>
                            <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400 mb-1">
                                About This Spot
                            </h4>
                            <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1a202c] p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                                {item.description}
                            </p>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <MapPin size={14} className="text-emerald-500" /> Location
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.address || "Mapandan, Pangasinan"}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">Barangay {item.barangay || "Mapandan"}</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Ticket size={14} className="text-amber-500" /> Entrance Fee
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.entranceFee || "Free / Not Specified"}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Clock size={14} className="text-blue-500" /> Best Time to Visit
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.bestTimeToVisit || "Anytime"}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Phone size={14} className="text-purple-500" /> Contact Hotline
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.contactNumber || "N/A"}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] sm:col-span-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Calendar size={14} className="text-rose-500" /> Date Registered
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {new Date(item.createdAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Pinned Map */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Navigation size={14} className="text-emerald-500" /> Pinned Geolocation Map
                        </h4>
                        <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3040] shadow-inner bg-slate-100 relative">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={mapIframeUrl}
                                allowFullScreen
                                loading="lazy"
                                title={`Pinned location map for ${item.name}`}
                            />
                        </div>
                    </div>

                    {/* External Links */}
                    {item.googleMapsUrl && (
                        <div className="space-y-2 pt-1">
                            <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400">
                                External References
                            </h4>
                            <div className="flex items-center gap-3 flex-wrap">
                                <a
                                    href={item.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                >
                                    <Globe size={14} /> Open in Google Maps
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
