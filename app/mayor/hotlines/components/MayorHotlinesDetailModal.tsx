"use client";

import React, { useEffect } from "react";
import {
    PhoneCall,
    Phone,
    Smartphone,
    MapPin,
    CheckCircle2,
    XCircle,
    Calendar,
} from "lucide-react";

export interface HotlineDetailItem {
    id: string;
    name: string;
    category: string;
    mobileNumber?: string | null;
    telephone?: string | null;
    address?: string | null;
    order: number;
    isActive: boolean;
    createdAt: string | Date;
}

interface MayorHotlinesDetailModalProps {
    item: HotlineDetailItem | null;
    onClose: () => void;
    themeColor?: string;
}

export function MayorHotlinesDetailModal({ item, onClose, themeColor = "#2563eb" }: MayorHotlinesDetailModalProps) {
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

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner */}
                <div className="relative p-6 bg-slate-900 text-white flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                            style={{ backgroundColor: themeColor }}
                        >
                            <PhoneCall size={24} />
                        </div>
                        <div>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest border border-white/10">
                                {item.category || "Emergency Service"}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight drop-shadow-md mt-1">
                                {item.name}
                            </h2>
                        </div>
                    </div>
                    <div>
                        {item.isActive ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                <CheckCircle2 size={12} /> Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/90 backdrop-blur-md text-slate-300 text-[10px] font-black uppercase italic tracking-widest shadow">
                                <XCircle size={12} /> Inactive
                            </span>
                        )}
                    </div>
                </div>

                {/* Modal Body / Info Grid */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Mobile Number */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Smartphone size={14} className="text-emerald-500" /> Mobile Hotline
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.mobileNumber || "N/A"}
                            </p>
                        </div>

                        {/* Telephone */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Phone size={14} className="text-purple-500" /> Telephone
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.telephone || "N/A"}
                            </p>
                        </div>

                        {/* Address / Location */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] sm:col-span-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <MapPin size={14} className="text-blue-500" /> Station Address / Location
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.address || "Mapandan, Pangasinan"}
                            </p>
                        </div>

                        {/* Date Registered */}
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
                </div>
            </div>
        </div>
    );
}
