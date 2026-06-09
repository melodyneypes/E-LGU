"use client";

import { useState } from "react";
import { User, Shield, Facebook, Phone, Calendar, Home, Mail, Globe, Trophy, GraduationCap, Quote, Copy, Check, Share2, Briefcase } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Official {
    id: string;
    name: string;
    position: string;
    imageUrl?: string | null;
    contactNumber?: string | null;
    email?: string | null;
    links?: any;
    termStart?: string | Date | null;
    termEnd?: string | Date | null;
    bio?: string | null;
    motto?: string | null;
    education?: string | null;
    achievements?: string | null;
}

export function OfficialDetailView({ official }: { official: Official; themeColor?: string }) {
    const [idCopied, setIdCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setIdCopied(true);
        toast.success("Contact number copied!");
        setTimeout(() => setIdCopied(false), 2000);
    };

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
            toast.success("Profile link copied!");
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success("Profile link copied!");
        }
    };

    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
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
                                <Link href="/user/officials" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Leadership
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[150px] truncate">{official.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto px-4 md:px-0 space-y-8 md:space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    {/* Profile Column */}
                    <div className="lg:col-span-5 space-y-6 md:space-y-8 lg:sticky lg:top-28 h-fit">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] md:rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                            <div className="relative aspect-[4/5] rounded-2xl md:rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl bg-white dark:bg-[#0a0c10]">
                                {official.imageUrl ? (
                                    <Image
                                        src={official.imageUrl}
                                        alt={official.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-24 h-24 text-slate-200 dark:text-slate-800" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
                                <div className="absolute bottom-6 left-6 right-6 md:hidden">
                                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{official.name}</h1>
                                    <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px] italic">{official.position}</p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight">
                                {official.name}
                            </h1>
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-primary" />
                                <p className="text-primary font-black uppercase tracking-[0.3em] text-sm italic">{official.position}</p>
                            </div>
                        </div>

                        {official.motto && (
                            <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm italic relative">
                                <Quote className="w-6 h-6 text-primary absolute -top-3 -left-3 bg-white dark:bg-[#0a0c10] rounded-full p-1 border border-slate-100 dark:border-white/5" />
                                <p className="text-sm md:text-lg font-medium text-slate-600 dark:text-slate-400 leading-relaxed pl-2">
                                    &quot;{official.motto}&quot;
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button onClick={handleShare} className="flex-1 h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-primary hover:text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] italic shadow-md transition-all active:scale-95 gap-2">
                                <Share2 className="w-4 h-4" />
                                Share Profile
                            </Button>
                        </div>
                    </div>

                    {/* Information Column */}
                    <div className="lg:col-span-7 space-y-8 md:space-y-12">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="p-6 md:p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Current Term</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] md:text-xs">
                                        <span className="font-bold text-slate-400 uppercase tracking-widest">Election Date</span>
                                        <span className="font-black text-slate-700 dark:text-slate-300 italic">{formatDate(official.termStart) || "----"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] md:text-xs">
                                        <span className="font-bold text-slate-400 uppercase tracking-widest">End of Mandate</span>
                                        <span className="font-black text-slate-700 dark:text-slate-300 italic">{formatDate(official.termEnd) || "Present"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 bg-primary/5 dark:bg-primary/10 rounded-2xl md:rounded-3xl border border-primary/20 space-y-4 flex flex-col justify-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Briefcase className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Status</h3>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xl md:text-2xl font-black italic tracking-tighter text-primary uppercase leading-tight">Active Official</p>
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Serving the people of Mapandan</p>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Content Sections */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Biography & Vision</h2>
                            </div>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none">
                                <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-wrap">
                                    {official.bio || `Hon. ${official.name} is a dedicated public servant committed to the progress and welfare of Mapandan. Through transparent governance and community-focused initiatives, the office continues to work towards sustainable development and improved local services.`}
                                </p>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <section className="p-6 md:p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                                        <GraduationCap className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Education</h2>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed whitespace-pre-wrap">
                                    {official.education || "Information being updated."}
                                </p>
                            </section>

                            <section className="p-6 md:p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500/5 rounded-xl flex items-center justify-center shrink-0">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Achievements</h2>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed whitespace-pre-wrap">
                                    {official.achievements || "Information being updated."}
                                </p>
                            </section>
                        </div>

                        {/* Contact Widget */}
                        <div className="p-8 md:p-12 bg-slate-900 dark:bg-[#0a0c10] rounded-2xl md:rounded-[3rem] text-white relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                <Shield className="w-32 h-32 rotate-12" />
                            </div>
                            <div className="relative space-y-8">
                                <div>
                                    <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-none mb-4">Official Contact</h3>
                                    <p className="text-white/60 font-medium italic max-w-md text-xs md:text-sm">
                                        Direct line for official business, Resident concerns, and municipal coordination.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
                                    <div className="space-y-6">
                                        {official.contactNumber && (
                                            <div
                                                onClick={() => handleCopy(official.contactNumber!)}
                                                className="flex items-center gap-4 group/item cursor-pointer w-fit"
                                            >
                                                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all">
                                                    <Phone className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Hotline</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm md:text-2xl font-black italic tracking-tighter">{official.contactNumber}</p>
                                                        {idCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/20 opacity-0 group-hover/item:opacity-100" />}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {official.email && (
                                            <Link href={`mailto:${official.email}`} className="flex items-center gap-4 group/item w-fit">
                                                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all">
                                                    <Mail className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">E-mail</p>
                                                    <p className="text-sm md:text-2xl font-black italic tracking-tighter lowercase">{official.email}</p>
                                                </div>
                                            </Link>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {Array.isArray(official.links) && official.links.length > 0 && (
                                            <div className="flex flex-col gap-6">
                                                {(official.links as { label: string; url: string }[]).filter(link => link.url).map((link, idx) => (
                                                    <Link key={idx} href={link.url || null as any} target="_blank" className="flex items-center gap-4 group/link w-fit">
                                                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all">
                                                            {link.label.toLowerCase().includes('facebook') ? <Facebook className="w-4 h-4 md:w-6 md:h-6 text-white" /> : <Globe className="w-4 h-4 md:w-6 md:h-6 text-white" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Platform</p>
                                                            <p className="text-sm md:text-2xl font-black italic tracking-tighter">{link.label}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
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

