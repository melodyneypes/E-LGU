"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Briefcase, Building, Timer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";


interface Job {
    id: string;
    title: string;
    department: string;
    description: string;
    employmentType: string;
    deadline?: Date | string;
    createdAt: Date | string;
}

export function JobBoard({ jobs = [], isMaintenanceActive = false }: { jobs: Job[]; isMaintenanceActive?: boolean }) {
    const hasJobs = jobs.length > 0;
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!hasJobs) {
        return (
            <section id="careers" className="pt-0 md:pt-24 pb-12 md:pb-24 px-6 bg-slate-50 dark:bg-white/5 border-y border-slate-100 dark:border-white/5">
                <div className="max-w-7xl mx-auto text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Briefcase className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Serve the Community
                    </h2>
                    <p className="text-slate-400 font-medium italic">No active opportunities at the moment. Please check back later.</p>
                </div>
            </section>
        );
    }

    // Only take the first 3 (closest to deadline)
    const limitedJobs = jobs.slice(0, 3);

    return (
        <section id="careers" className="pt-0 md:pt-24 pb-12 md:pb-24 px-6 bg-slate-50 dark:bg-white/5 border-y border-slate-100 dark:border-white/5">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                <div className="text-center space-y-2 md:space-y-4 sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-slate-50/95 dark:bg-slate-950/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                    <h2 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Serve the Community
                    </h2>
                    <p className="text-slate-500 font-medium italic max-w-xl mx-auto text-xs md:text-lg">
                        Explore immediate career opportunities within the Mapandan Municipal Government.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mt-6 md:mt-0">
                    {limitedJobs.map((job: Job, idx: number) => (
                        <JobCard key={job.id} job={job} idx={idx} isMobile={isMobile} isMaintenanceActive={isMaintenanceActive} />
                    ))}
                </div>

                {!isMaintenanceActive && (
                    <div className="text-center pt-2">
                        <Button asChild className="px-8 py-3.5 md:px-12 md:py-5 h-auto bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-[2rem] transition-all shadow-xl shadow-primary/25 active:scale-95 flex items-center justify-center gap-2 md:gap-3 mx-auto w-full md:w-auto">
                            <Link href="/user/jobs">
                                <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                View All Open Positions
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}

function JobCard({ job, idx, isMobile, isMaintenanceActive }: { job: Job; idx: number; isMobile: boolean; isMaintenanceActive?: boolean }) {
    const cardContent = (
        <Link
            href={isMaintenanceActive ? "#" : `/user/jobs/${job.id}`}
            className={`${isMaintenanceActive ? "opacity-60 pointer-events-none" : "hover:border-primary/40 active:scale-[0.98]"} bg-white dark:bg-[#0f1117] p-4 md:p-10 rounded-3xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all group flex flex-col justify-between min-h-[240px] md:h-[420px] relative overflow-hidden block`}
        >
            <div className="space-y-3 md:space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        {job.deadline && (
                            <div className="flex items-center gap-1.5 md:gap-2 text-red-500 font-black uppercase tracking-widest text-[8px] md:text-[9px] italic mb-1">
                                <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                Deadline: {format(new Date(job.deadline), "MMM d, yyyy")}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold italic text-[8px] md:text-[9px]">
                            <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                            <span>Posted {format(new Date(job.createdAt), "MMM d, yyyy")}</span>
                        </div>
                    </div>
                    {isMaintenanceActive ? (
                        <span className="px-2.5 md:px-4 py-1 md:py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                            Offline
                        </span>
                    ) : (
                        <span className="px-2.5 md:px-4 py-1 md:py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                            {job.employmentType}
                        </span>
                    )}
                </div>

                <div className="space-y-1.5 md:space-y-4">
                    <h3 className="text-base md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight line-clamp-2 min-h-[2rem] md:min-h-[3rem]">
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-1.5 md:gap-2 text-slate-500">
                        <Building className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate italic">{job.department}</span>
                    </div>
                </div>

                <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium italic line-clamp-2 md:line-clamp-3 leading-relaxed">
                    {job.description}
                </p>
            </div>

            {!isMaintenanceActive && (
                <div className="pt-3 md:pt-6 relative z-20">
                    <Button asChild className="w-full py-2.5 md:py-4 h-auto bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-xl shadow-primary/25 pointer-events-none">
                        <div className="flex items-center gap-1.5 md:gap-3">
                            <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            Learn More
                        </div>
                    </Button>
                </div>
            )}
        </Link>
    );

    if (isMobile) {
        return cardContent;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
        >
            {cardContent}
        </motion.div>
    );
}
