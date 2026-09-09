"use client";

import { useHotlines } from "../providers/HotlinesProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, ShieldAlert, Activity } from "lucide-react";
import { motion } from "framer-motion";

export function HotlinesCards() {
    const { totalCount, hotlinesData } = useHotlines();

    const total = totalCount || hotlinesData.length;
    const emergencyHotlines = hotlinesData.filter((h) => ["Police", "Fire", "Emergency"].includes(h.category)).length;
    const medicalHotlines = hotlinesData.filter((h) => ["Medical", "Hospital", "Clinic", "RHU"].includes(h.category)).length;

    const cards = [
        {
            title: "Total Directory Links",
            value: total,
            icon: Phone,
            color: "text-primary",
            bg: "bg-primary/10 dark:bg-primary/20",
        },
        {
            title: "Emergency & Security",
            value: emergencyHotlines,
            icon: ShieldAlert,
            color: "text-rose-600",
            bg: "bg-rose-50 dark:bg-rose-900/20",
        },
        {
            title: "Medical & Health",
            value: medicalHotlines,
            icon: Activity,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cards.map((card, index) => (
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl ring-1 ring-slate-200 dark:ring-white/5">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 rounded-xl ${card.bg} shrink-0`}>
                                    <card.icon className={`w-4 h-4 ${card.color}`} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{card.title}</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">{card.value}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
