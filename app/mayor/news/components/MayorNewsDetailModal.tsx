"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
    Calendar,
    Tag,
    MapPin,
    User,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { format } from "date-fns";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface MayorNewsDetailItem {
    id: string;
    title: string;
    content?: string | null;
    category: string;
    author?: string | null;
    imageUrl?: string | null;
    publishDate?: Date | string | null;
    barangay?: string | null;
    isPublished?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

interface MayorNewsDetailModalProps {
    item: MayorNewsDetailItem | null;
    onClose: () => void;
    themeColor?: string;
}

export function MayorNewsDetailModal({
    item,
    onClose,
}: MayorNewsDetailModalProps) {
    // Lock body scroll when modal is open & close on Escape key
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

    const formattedPublishDate = item.publishDate
        ? format(new Date(item.publishDate), "MMMM d, yyyy · h:mm a")
        : "";

    const authorDisplay = item.author || "Municipal Information Office";

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner (Only shown if imageUrl exists) */}
                {item.imageUrl ? (
                    <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-[#1e2330]">
                        <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                        {/* Banner Badges & Title */}
                        <div className="absolute bottom-4 left-6 right-6">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                    {item.category}
                                </span>
                                {item.isPublished !== false ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                        <CheckCircle2 size={12} /> Published
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                        <XCircle size={12} /> Draft
                                    </span>
                                )}
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight drop-shadow-md line-clamp-2 cursor-pointer">
                                            {item.title}
                                        </h2>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[110]">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                ) : (
                    /* Collapsed Header when no image is present */
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] space-y-3 bg-slate-50/50 dark:bg-[#1a202c]/50">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase italic tracking-widest">
                                {item.category}
                            </span>
                            {item.isPublished !== false ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase italic tracking-widest">
                                    <CheckCircle2 size={12} /> Published
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase italic tracking-widest">
                                    <XCircle size={12} /> Draft
                                </span>
                            )}
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight line-clamp-2 cursor-pointer">
                                        {item.title}
                                    </h2>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[110]">
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                {/* Modal Body / Information (MayorKainan style) */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar pr-3">
                    {/* Article Content Body */}
                    <div>
                        <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400 mb-1">
                            Article Body / Content
                        </h4>
                        <div className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1a202c] p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040] whitespace-pre-wrap">
                            {item.content || (
                                <span className="italic text-slate-400">No text content provided for this article.</span>
                            )}
                        </div>
                    </div>

                    {/* Info Grid (2-column layout) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Scope / Barangay */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <MapPin size={14} className="text-emerald-500" /> Target Scope
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.barangay || "Whole Municipality"}
                            </p>
                        </div>

                        {/* Author */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <User size={14} className="text-blue-500" /> Author / Journalist
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                {authorDisplay}
                            </p>
                        </div>

                        {/* Publish Date */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Calendar size={14} className="text-purple-500" /> Publish Date
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formattedPublishDate}
                            </p>
                        </div>

                        {/* Category */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-1">
                                <Tag size={14} className="text-amber-500" /> Category Tag
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.category}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
