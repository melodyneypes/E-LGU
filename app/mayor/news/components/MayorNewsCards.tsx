"use client";

import { useMayorNews } from "./MayorNewsProvider";
import { Newspaper, BellRing, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MayorNewsCards() {
    const { newsData } = useMayorNews();

    const totalNews = newsData.length;
    const announcements = newsData.filter((n) => n.category === "Announcement").length;
    const localNews = newsData.filter((n) => n.category === "Local News").length;

    const cards = [
        {
            title: "Total Articles",
            value: totalNews,
            icon: Newspaper,
            color: "text-primary",
            bg: "bg-primary/10 dark:bg-primary/20",
        },
        {
            title: "Announcements",
            value: announcements,
            icon: BellRing,
            color: "text-amber-600",
            bg: "bg-amber-100 dark:bg-amber-900/20",
        },
        {
            title: "Local News",
            value: localNews,
            icon: Navigation,
            color: "text-emerald-600",
            bg: "bg-emerald-100 dark:bg-emerald-900/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={index}
                        className="border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl overflow-hidden relative group ring-1 ring-slate-200 dark:ring-white/5"
                    >
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
                                <div className={`p-2.5 rounded-xl ${card.bg} shadow-inner shrink-0`}>
                                    <Icon className={`w-4 h-4 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
