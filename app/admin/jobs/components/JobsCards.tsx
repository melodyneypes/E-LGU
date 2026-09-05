"use client";

import { useJobs } from "../providers/JobsProvider";
import { Briefcase, Activity, FileText } from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

export function JobsCards() {
    const { jobsData, themeColor } = useJobs();

    const totalJobs = jobsData.length;
    const activeJobs = jobsData.filter(j => j.isActive).length;
    const closedJobs = totalJobs - activeJobs;

    const cards = [
        {
            title: "Total Job Postings",
            value: totalJobs,
            icon: Briefcase,
            color: "text-white",
            bg: themeColor,
        },
        {
            title: "Active Openings",
            value: activeJobs,
            icon: Activity,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
        },
        {
            title: "Closed Positions",
            value: closedJobs,
            icon: FileText,
            color: "text-slate-600 dark:text-slate-400",
            bg: "bg-slate-100 dark:bg-slate-800",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((card, index) => (
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-white/5 group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5 -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">{card.title}</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">{card.value}</p>
                        </div>
                        <div 
                            className={`p-4 rounded-2xl shadow-inner ${card.bg === themeColor ? '' : card.bg}`}
                            style={card.bg === themeColor ? { backgroundColor: themeColor, boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)` } as CSSProperties : {}}
                        >
                            <card.icon className={`${card.color} w-7 h-7`} />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
