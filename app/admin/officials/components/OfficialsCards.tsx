"use client";

import { useOfficials } from "../providers/OfficialsProvider";
import { Users, UserCheck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

export function OfficialsCards() {
    const { officialsData, selectedCategory, selectedBarangay, themeColor } = useOfficials();

    // Apply the same filtering logic as the table
    const displayData = (officialsData as any[]).filter(item => {
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        
        // Barangay Filtering Logic
        let matchesBarangay = false;
        if (selectedBarangay === "LGU") {
            matchesBarangay = item.category === "LGU" || !item.barangay;
        } else {
            matchesBarangay = item.barangay === selectedBarangay;
        }

        return matchesCategory && matchesBarangay;
    });

    const totalOfficials = displayData.length;
    const activeOfficials = displayData.filter(o => o.isActive).length;
    const mayorsAndVice = displayData.filter(o => {
        const pos = o.position.toLowerCase();
        return pos.includes("mayor") || pos.includes("captain") || pos.includes("chairman");
    }).length;

    const cards = [
        {
            title: "Total Council Members",
            value: totalOfficials,
            icon: Users,
            color: "text-white",
            bg: themeColor,
        },
        {
            title: "Active Term",
            value: activeOfficials,
            icon: UserCheck,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
        },
        {
            title: "Executive Officers",
            value: mayorsAndVice,
            icon: ShieldCheck,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10",
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
