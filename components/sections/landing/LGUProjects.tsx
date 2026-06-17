"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FolderKanban, MapPin, Gauge, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Project {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    location: string;
    progress: number;
    imageUrl: string | null;
    startDate: Date | null;
}

interface LGUProjectsProps {
    projects: Project[];
}

export function LGUProjects({ projects }: LGUProjectsProps) {
    const filteredProjects = projects;
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!projects || filteredProjects.length === 0) return null;

    return (
        <section id="projects" className="pt-16 md:pt-20 pb-12 px-6 max-w-7xl mx-auto">
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-0.5 bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Infrastructure</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        LGU Projects
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-10">
                {filteredProjects.map((project, idx) => (
                    <ProjectCard key={project.id} project={project} idx={idx} isMobile={isMobile} />
                ))}
            </div>

            <div className="flex justify-center mt-8 md:mt-12">
                <Link href="/user/projects" className="w-full md:w-auto">
                    <Button 
                        className="w-full md:w-[400px] px-8 py-3.5 md:py-5 h-auto bg-primary hover:opacity-90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-xl shadow-primary/25 active:scale-95 group flex items-center justify-center gap-2 md:gap-3 border-none"
                    >
                        <FolderKanban className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        View All Projects
                    </Button>
                </Link>
            </div>
        </section>
    );
}

function ProjectCard({ project, idx, isMobile }: { project: Project; idx: number; isMobile: boolean }) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);

    const content = (
        <Link 
            href={`/user/projects/${project.id}`}
            className="group block bg-white dark:bg-[#0f1117] rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] overflow-hidden hover:border-primary/40 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-full active:scale-[0.98]"
        >
            {/* Image Header */}
            <div className="relative h-32 md:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
                <Image
                    src={project.imageUrl || "/projects/default.png"}
                    alt={project.title}
                    fill
                    loading="lazy"
                    onLoad={() => setIsImageLoading(false)}
                    className={cn(
                        "object-cover transition-all duration-700",
                        isImageLoading ? 'opacity-0 blur-sm scale-110' : 'opacity-100 blur-0 scale-100',
                        "group-hover:scale-110"
                    )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />
                
                <div className="absolute top-4 md:top-6 left-4 md:left-6 z-30">
                    <span className={cn(
                        "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border shadow-lg",
                        project.status === "Completed" 
                            ? "bg-emerald-500/90 text-white border-emerald-400/30"
                            : "bg-primary/90 text-white border-white/20"
                    )}>
                        {project.status}
                    </span>
                </div>

                <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 flex items-center justify-between z-30">
                    <div className="flex items-center gap-2 text-white/90">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                            {project.location}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                        <Gauge className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-white">{project.progress}%</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3.5 md:p-8 space-y-2.5 md:space-y-4 flex-1 flex flex-col relative z-30">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <Calendar className="w-2.5 h-2.5" />
                        {project.startDate ? format(new Date(project.startDate), "MMM yyyy") : "TBA"}
                    </div>
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{project.category}</span>
                </div>

                <div className="space-y-1.5 md:space-y-2 flex-1">
                    <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">
                        {project.title}
                    </h3>
                    <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-medium italic line-clamp-2 md:line-clamp-3 leading-relaxed">
                        {project.description}
                    </p>
                </div>

                <div className="pt-3 md:pt-6">
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden shadow-inner">
                        {isMobile ? (
                            <div 
                                style={{ width: `${project.progress}%` }}
                                className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--primary-theme)] opacity-80"
                            />
                        ) : (
                            <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${project.progress}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--primary-theme)] opacity-80"
                            />
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );

    if (isMobile) {
        return <div>{content}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
        >
            {content}
        </motion.div>
    );
}
