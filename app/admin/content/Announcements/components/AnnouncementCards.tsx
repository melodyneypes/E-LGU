"use client";

import { useAnnouncements } from "../providers/AnnouncementProvider";
import { Megaphone, AlertTriangle, Pin, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AnnouncementCards() {
    const { announcements, themeColor } = useAnnouncements();

    const total = announcements.length;
    const active = announcements.filter(a => a.isActive).length;
    const pinned = announcements.filter(a => a.isPinned && a.isActive).length;
    const critical = announcements.filter(a => a.priority === "Critical" && a.isActive).length;

    const cards = [
        {
            title: "Total Notices",
            value: total,
            icon: Megaphone,
            style: { color: themeColor },
            bgStyle: { backgroundColor: `${themeColor}20` },
        },
        {
            title: "Active Notices",
            value: active,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        },
        {
            title: "Pinned Briefs",
            value: pinned,
            icon: Pin,
            color: "text-orange-600",
            bg: "bg-orange-100 dark:bg-orange-900/20",
        },
        {
            title: "Critical Alerts",
            value: critical,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-100 dark:bg-red-900/20",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index} className="border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl overflow-hidden relative group ring-1 ring-slate-200 dark:ring-white/5">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5 -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                                        {card.title}
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
                                        {card.value}
                                    </h3>
                                </div>
                                <div 
                                    className={`p-2.5 rounded-xl shadow-inner shrink-0 ${card.bg || ""}`}
                                    style={card.bgStyle}
                                >
                                    <Icon 
                                        className={`w-4 h-4 ${card.color || ""}`} 
                                        style={card.style}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
