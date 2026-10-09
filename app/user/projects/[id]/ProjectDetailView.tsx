"use client";

import { MapPin, Briefcase, PhilippinePeso, Clock, Share2, CheckCircle2, Circle, PlayCircle, XCircle, Gauge } from "lucide-react";
import Image from "next/image";
import { UserBreadcrumb } from "@/components/shared/UserBreadcrumb";
import { format } from "date-fns";
import { Project } from "../../../admin/projects/providers/ProjectsProvider";
import { toast } from "sonner";
import lguConfig from "@/config/lgu.config.json";

function getStatusIcon(status: string) {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "completed") return <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />;
    if (lowerStatus === "ongoing" || lowerStatus === "in progress") return <PlayCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />;
    if (lowerStatus === "pending" || lowerStatus === "planned") return <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />;
    if (lowerStatus === "cancelled" || lowerStatus === "on hold") return <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />;
    return <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />;
}

export function ProjectDetailView({ project }: { project: Project }) {
    const handleShare = async () => {
        const url = window.location.href;
        const title = document.title;

        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return;
            } catch (err) {
                if ((err as Error).name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success("Project link copied!");
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success("Project link copied!");
        }
    };

    return (
        <div className="min-h-screen pb-20 space-y-6 md:space-y-10">
            {/* Breadcrumb section */}
            <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                <UserBreadcrumb items={[
                    { label: "Municipal Projects", href: "/user/projects" },
                    { label: project.title }
                ]} />
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-4 md:px-0 space-y-8 md:space-y-12">
                {/* Hero Section */}
                <div className="relative aspect-video w-full rounded-2xl md:rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 group">
                    <Image
                        src={project.imageUrl || lguConfig.assets.contentPlaceholder}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-1000"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 left-4 md:top-8 md:left-8 flex flex-wrap gap-2">
                        <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary shadow-2xl">
                            {project.category}
                        </div>
                        <div className="px-4 py-2 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5" />
                            {project.progress}% Complete
                        </div>
                    </div>
                </div>

                {/* Header Information */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight pt-2 pb-1">
                            {project.title}
                        </h1>
                        <button 
                            onClick={handleShare}
                            className="p-3 md:p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl shadow-md hover:bg-primary hover:text-white transition-all shrink-0 group"
                        >
                            <Share2 className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-white dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 dark:bg-primary/20 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">Location</span>
                                <span className="text-[8px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic truncate">
                                    {project.location}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-white dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 dark:bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                {getStatusIcon(project.status)}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">Status</span>
                                <span className="text-[8px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic truncate">
                                    {project.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-8 space-y-10">
                        <div className="prose prose-xl md:prose-2xl prose-slate dark:prose-invert max-w-none">
                            <p className="text-sm md:text-2xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed md:leading-[1.8] whitespace-pre-wrap">
                                {project.description}
                            </p>
                        </div>

                        {/* Project Stats Footer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100 dark:border-white/5">
                            {project.budget && (
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 group hover:border-primary transition-colors">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                        <PhilippinePeso className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Budget Allocated</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">{project.budget}</p>
                                    </div>
                                </div>
                            )}
                            {project.contractor && (
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 group hover:border-primary transition-colors">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <Briefcase className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Implementing Partner</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">{project.contractor}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {/* Timeline Widget */}
                        <div className="p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-8">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Project Timeline</h3>
                            </div>
                            
                            <div className="space-y-6">
                                {project.startDate && (
                                    <div className="relative pl-6 border-l-2 border-primary/20">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-primary rounded-full border-4 border-white dark:border-[#0a0c10]" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Start Date</p>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{format(new Date(project.startDate), "MMMM d, yyyy")}</p>
                                    </div>
                                )}
                                {project.endDate && (
                                    <div className="relative pl-6 border-l-2 border-primary/20">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-200 dark:bg-white/10 rounded-full border-4 border-white dark:border-[#0a0c10]" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Target End</p>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{format(new Date(project.endDate), "MMMM d, yyyy")}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic">
                                        <span className="text-slate-400">Total Progress</span>
                                        <span className="text-primary">{project.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

