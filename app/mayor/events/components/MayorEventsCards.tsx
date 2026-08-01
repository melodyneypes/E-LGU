"use client";

import { useMayorEvents } from "./MayorEventsProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, Star } from "lucide-react";

export function MayorEventsCards() {
    const { events } = useMayorEvents();

    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => new Date(e.startDate) > new Date()).length;
    const happeningNow = events.filter((e) => {
        const now = new Date();
        return new Date(e.startDate) <= now && new Date(e.endDate) >= now;
    }).length;
    const festivals = events.filter((e) => e.category === "Festival").length;

    const stats = [
        {
            label: "Total Events",
            value: totalEvents,
            icon: Calendar,
            color: "text-primary",
            bg: "bg-primary/10 dark:bg-primary/20",
        },
        {
            label: "Happening Now",
            value: happeningNow,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            label: "Upcoming",
            value: upcomingEvents,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
            label: "Festivals",
            value: festivals,
            icon: Star,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card
                        key={index}
                        className="overflow-hidden border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl ring-1 ring-slate-200 dark:ring-white/5"
                    >
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                        {stat.label}
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
                                        {stat.value}
                                    </h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
