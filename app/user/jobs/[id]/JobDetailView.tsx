"use client";

import { Briefcase, MapPin, Clock, Globe, Home, Share2, Navigation, Timer, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Job } from "../../../admin/jobs/providers/JobsProvider";
import { toast } from "sonner";

export function JobDetailView({ job }: { job: Job }) {
    const links = Array.isArray(job.links) ? job.links : [];
    const mapLink = job.mapUrl;

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
            toast.success("Job link copied!");
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success("Job link copied!");
        }
    };

    return (
        <div className="min-h-screen pb-20 space-y-6 md:space-y-10">
            {/* Breadcrumb section */}
            <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                <Breadcrumb>
                    <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    <Home className="w-3.5 h-3.5 mb-0.5" />
                                    Home
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/user/jobs" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Careers
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[150px] truncate">{job.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-4 md:px-0 space-y-8 md:space-y-12">
                {/* Header Information */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 italic">
                            {job.employmentType}
                        </div>
                        <div className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                            <Briefcase className="w-3.5 h-3.5 text-primary" />
                            {job.department}
                        </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight pt-2 pb-1">
                            {job.title}
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
                                    {job.location || "LGU Mapandan"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-white dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">Comp. Range</span>
                                <span className="text-[8px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic truncate">
                                    {job.salary || "S.G. Grade"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-8 space-y-4 md:space-y-6">
                        {/* Job Description Card */}
                        <div className="p-6 md:p-10 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Job Description</h2>
                            </div>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none">
                                <p className="text-sm md:text-2xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed md:leading-[1.8] whitespace-pre-wrap">
                                    {job.description}
                                </p>
                            </div>
                        </div>

                        {/* Minimum Qualifications Card */}
                        <div className="p-6 md:p-10 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Minimum Qualifications</h2>
                            </div>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none">
                                <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-wrap">
                                    {job.qualifications}
                                </p>
                            </div>
                        </div>

                        {/* Application Requirements Card */}
                        <div className="p-6 md:p-10 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Application Requirements</h2>
                            </div>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none">
                                <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-wrap">
                                    {job.requirements}
                                </p>
                            </div>
                        </div>

                        {mapLink && (
                            <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Office Location</h2>
                                </div>
                                <div className="aspect-video w-full bg-slate-100 dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl relative group/map">
                                    <iframe 
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={mapLink?.includes("embed") ? mapLink : `https://maps.google.com/maps?q=${encodeURIComponent(job.location ? `${job.location}, Mapandan, Pangasinan` : 'Mapandan, Pangasinan')}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                                        allowFullScreen 
                                        loading="lazy" 
                                    ></iframe>
                                    <div className="absolute top-4 right-4 z-20">
                                        <Link href={job.mapUrl || `https://maps.google.com/maps?q=${encodeURIComponent(`${job.location || 'Municipal Office'}, Mapandan`)}`} target="_blank">
                                            <Button className="bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 px-6 h-10 shadow-2xl">
                                                <Navigation className="w-3.5 h-3.5" />
                                                Get Directions
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28 h-fit">
                        {/* Application Widget */}
                        <div className="p-8 bg-slate-900 dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                            
                            <div className="relative space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Timer className="w-5 h-5 text-primary" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white italic">Submission Deadline</h3>
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">
                                        {job.deadline ? format(new Date(job.deadline), "MMMM d, yyyy") : "Open Recruitment"}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-primary" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white italic">Application Links</h3>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {links.filter((link: any) => link?.url).length > 0 ? links.filter((link: any) => link?.url).map((link: any, idx: number) => (
                                            <Link 
                                                key={idx}
                                                href={link.url || null as any}
                                                target="_blank"
                                                className="w-full h-14 bg-white/10 hover:bg-primary transition-all rounded-2xl flex items-center justify-between px-6 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic"
                                            >
                                                {link.label}
                                                <Navigation className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                                            </Link>
                                        )) : (
                                            <div className="py-6 text-center border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                                                Apply Personally at LGU Office
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Widget */}
                        <div className="p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Opportunity Status</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recruitment</span>
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 italic">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Post Date</span>
                                    <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">
                                        {format(new Date(job.createdAt), "MMM d, yyyy")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

