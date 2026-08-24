"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    FileText,
    CheckCircle2,
    AlertCircle,
    Paperclip,
    Building2,
    Search,
    CheckCheck,
    ChevronRight,
    ChevronDown,
    Filter,
    Layers,
    User,
    Check,
} from "lucide-react";
import { markAllDirectivesAsRead } from "@/app/captain/notifications/actions";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DirectiveNotificationItem {
    id: string;
    title: string;
    content: string;
    category: string;
    priority: string;
    targetScope: string;
    targetBarangay: string | null;
    targetBarangays?: string[];
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentSize: string | null;
    senderName: string;
    createdAt: string;
    isRead: boolean;
    readAt: string | null;
}

interface CaptainDirectivesClientProps {
    initialData: DirectiveNotificationItem[];
    managedBarangay: string;
}

const CATEGORY_OPTIONS = [
    { label: "All Categories", value: "ALL", icon: Layers, desc: "Show all municipal issuances" },
    { label: "Memorandum", value: "MEMORANDUM", icon: FileText, desc: "Official policy memos" },
    { label: "Executive Advisory", value: "ADVISORY", icon: AlertCircle, desc: "Urgent guidance & alerts" },
    { label: "Mayoral Directive", value: "DIRECTIVE", icon: Building2, desc: "Actionable municipal orders" },
    { label: "Executive Order", value: "EXECUTIVE_ORDER", icon: FileText, desc: "Formal executive mandates" },
];

export function CaptainDirectivesClient({
    initialData,
    managedBarangay,
}: CaptainDirectivesClientProps) {
    const [directives, setDirectives] = useState<DirectiveNotificationItem[]>(initialData);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 400ms Debounce for search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Realtime Supabase listener
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel("captain-directives-list-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ExecutiveDirective",
                },
                () => {
                    window.location.reload();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "DirectiveRecipientRead",
                },
                () => {
                    // Auto-sync
                }
            )
            .subscribe();

        return () => {
            if (channel && supabase) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const handleMarkAllAsRead = async () => {
        setDirectives((prev) => prev.map((d) => ({ ...d, isRead: true })));
        await markAllDirectivesAsRead();
        toast.success("All executive notifications marked as read.");
    };

    const getPriorityBadge = (p: string) => {
        if (p === "CRITICAL") {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Critical
                </span>
            );
        }
        if (p === "URGENT") {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Urgent
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Normal
            </span>
        );
    };

    const filteredDirectives = directives.filter((d) => {
        const query = debouncedSearch.trim().toLowerCase();
        const matchesSearch =
            query === "" ||
            d.title.toLowerCase().includes(query) ||
            d.content.toLowerCase().includes(query) ||
            d.senderName.toLowerCase().includes(query);

        const matchesCategory = categoryFilter === "ALL" || d.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const unreadCount = directives.filter((d) => !d.isRead).length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Filter Card with 400ms Debounced Search */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search notifications, memos, advisory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Custom Executive Category Dropdown Popover */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all shadow-sm cursor-pointer select-none active:scale-95 ${
                                    categoryFilter !== "ALL"
                                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                                        : "bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222938]"
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>
                                    {CATEGORY_OPTIONS.find((c) => c.value === categoryFilter)?.label || "Categories"}
                                </span>
                                <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                        isDropdownOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                                />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-64 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-[#2a3040] mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Filter By Category
                                        </p>
                                    </div>
                                    {CATEGORY_OPTIONS.map((opt) => {
                                        const isSelected = categoryFilter === opt.value;
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setCategoryFilter(opt.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-sm"
                                                                : "bg-slate-100 dark:bg-[#1e2330] text-slate-500 dark:text-slate-400"
                                                        }`}
                                                    >
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs leading-tight">{opt.label}</p>
                                                        <p className="text-[10px] text-slate-400 font-normal">
                                                            {opt.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                                <CheckCheck className="w-4 h-4" /> Mark all read
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notifications Feed List (Individual Spaced Cards) */}
            <div className="space-y-4">
                {filteredDirectives.length === 0 ? (
                    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-16 text-center text-slate-400 italic shadow-sm">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No notifications found</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Official dispatches and executive memos for Barangay {managedBarangay} will appear here.
                        </p>
                    </div>
                ) : (
                    filteredDirectives.map((item) => {
                        const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        });
                        const timeStr = new Date(item.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        return (
                            <Link
                                key={item.id}
                                href={`/captain/notifications/${item.id}`}
                                className={`p-5 sm:p-6 transition-all duration-200 block cursor-pointer group bg-white dark:bg-[#151b2b] border rounded-3xl shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:-translate-y-0.5 ${
                                    !item.isRead
                                        ? "border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50/50 via-white to-white dark:from-indigo-500/[0.07] dark:via-[#151b2b] dark:to-[#151b2b]"
                                        : "border-slate-200 dark:border-[#2a3040]"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        {/* Unread Status Dot or Read Icon */}
                                        <div className="mt-1 shrink-0">
                                            {!item.isRead ? (
                                                <span className="block w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60 animate-pulse" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-60" />
                                            )}
                                        </div>

                                        {/* Content Info */}
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1e2330] text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                                                    {item.category.replace("_", " ")}
                                                </span>
                                                {getPriorityBadge(item.priority)}
                                                <span className="text-xs text-slate-400 font-medium">
                                                    · {dateStr} at {timeStr}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {item.title}
                                            </h3>

                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                                {item.content}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                                                    <User className="w-3.5 h-3.5 text-slate-400" /> {item.senderName}
                                                </span>
                                                <span>·</span>
                                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {item.targetScope === "ALL_CAPTAINS" ? "All 15 Captains" : `Brgy. ${managedBarangay}`}
                                                </span>

                                                {item.attachmentUrl && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                                                            <Paperclip className="w-3 h-3" /> {item.attachmentName || "Attached PDF"}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0 pt-2 flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        <span className="text-xs font-bold hidden sm:inline">Read Full Directive</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
