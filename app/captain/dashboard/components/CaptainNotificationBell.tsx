"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Bell,
    FileText,
    CheckCheck,
    AlertCircle,
    Paperclip,
} from "lucide-react";
import { getCaptainNotifications, markDirectiveAsRead, markAllDirectivesAsRead } from "@/app/captain/notifications/actions";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface NotificationItem {
    id: string;
    title: string;
    content: string;
    category: string;
    priority: string;
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentSize: string | null;
    senderName: string;
    createdAt: string;
    isRead: boolean;
}

export function CaptainNotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = React.useCallback(async (showNewToast = false, newTitle?: string) => {
        try {
            const res = await getCaptainNotifications();
            if (res.success && res.notifications) {
                setNotifications(res.notifications);
                setUnreadCount(res.unreadCount || 0);

                if (showNewToast) {
                    toast.info("New Executive Directive Issued!", {
                        description: newTitle || "A new official memorandum was dispatched by the Mayor's Office.",
                        action: {
                            label: "View Memo",
                            onClick: () => setIsOpen(true),
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load notifications:", err);
        }
    }, []);

    // Initial Load & Fallback interval
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(() => loadNotifications(), 30000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Real-time Supabase Listener for ExecutiveDirective & DirectiveRecipientRead
    useEffect(() => {
        if (!supabase) return;

        let channel: any;
        try {
            channel = supabase
                .channel("captain-directives-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "ExecutiveDirective",
                    },
                    (payload: any) => {
                        const newDirective = payload.new;
                        loadNotifications(true, newDirective?.title);
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "ExecutiveDirective",
                    },
                    () => {
                        loadNotifications();
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "DELETE",
                        schema: "public",
                        table: "ExecutiveDirective",
                    },
                    () => {
                        loadNotifications();
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
                        loadNotifications();
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[Realtime Notifications] Failed to subscribe:", error);
        }

        return () => {
            if (channel && supabase) {
                supabase.removeChannel(channel);
            }
        };
    }, [loadNotifications]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectNotification = async (notif: NotificationItem) => {
        setIsOpen(false);
        if (!notif.isRead) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            await markDirectiveAsRead(notif.id);
        }
        window.location.href = `/captain/notifications/${notif.id}`;
    };

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        await markAllDirectivesAsRead();
        toast.success("All directives marked as read.");
    };

    const getPriorityBadge = (p: string) => {
        if (p === "CRITICAL") {
            return (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> Critical
                </span>
            );
        }
        if (p === "URGENT") {
            return (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> Urgent
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Normal
            </span>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-[#1e2330] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-sm"
                title="Executive Directives & Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg ring-2 ring-white dark:ring-[#151b2b] animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Drawer / Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-4 border-b border-slate-100 dark:border-[#2a3040] flex items-center justify-between bg-slate-50/70 dark:bg-[#121622]/70">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase italic tracking-wider text-slate-800 dark:text-slate-200">
                                Executive Directives
                            </h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <CheckCheck className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#2a3040]/50">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs">No executive directives or notices yet.</p>
                            </div>
                        ) : (
                            notifications.map((item) => {
                                const timeStr = new Date(item.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                });

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectNotification(item)}
                                        className={`p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer flex gap-3 items-start ${
                                            !item.isRead ? "bg-blue-50/40 dark:bg-blue-500/[0.04]" : ""
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {!item.isRead ? (
                                                <span className="block w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" />
                                            ) : (
                                                <span className="block w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    {item.category.replace("_", " ")}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{timeStr}</span>
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                                {item.title}
                                            </h4>

                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                                {item.content}
                                            </p>

                                            <div className="flex items-center justify-between pt-1">
                                                {getPriorityBadge(item.priority)}
                                                {item.attachmentUrl && (
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                        <Paperclip className="w-3 h-3" /> PDF Memo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* View All / Open Full Directives Desk Footer */}
                    <div className="p-3 bg-slate-50 dark:bg-[#121622] border-t border-slate-100 dark:border-[#2a3040] flex justify-center">
                        <Link
                            href="/captain/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-black uppercase italic tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 py-1"
                        >
                            <span>Open Full Directives & Memoranda Desk</span>
                            <FileText className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
