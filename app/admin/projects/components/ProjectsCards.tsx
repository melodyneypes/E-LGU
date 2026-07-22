"use client";

import { useProjects } from "../providers/ProjectsProvider";
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, Clock, CheckCircle2, PauseCircle } from "lucide-react";
import { motion } from "framer-motion";

export function ProjectsCards() {
    const { projectsData } = useProjects();

    const totalProjects = projectsData.length;
    const ongoingProjects = projectsData.filter((p) => p.status === "Ongoing").length;
    const completedProjects = projectsData.filter((p) => p.status === "Completed").length;
    const plannedProjects = projectsData.filter((p) => p.status === "Planned").length;

    const stats = [
        {
            label: "Total Projects",
            value: totalProjects,
            icon: FolderKanban,
            color: "text-primary",
            bg: "bg-primary/10 dark:bg-primary/20",
        },
        {
            label: "Ongoing",
            value: ongoingProjects,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
            label: "Completed",
            value: completedProjects,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            label: "Planned",
            value: plannedProjects,
            icon: PauseCircle,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl ring-1 ring-slate-200 dark:ring-white/5">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">{stat.value}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
