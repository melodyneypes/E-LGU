import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Megaphone, Tag, Pin, Clock, Home, AlertTriangle, ShieldCheck } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
        where: { id }
    });

    if (!announcement) {
        notFound();
    }

    const priorityColors = {
        Critical: "text-red-600 bg-red-50 dark:bg-red-950/30",
        High: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
        Normal: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
        Low: "text-slate-600 bg-slate-50 dark:bg-slate-950/30",
    };

    const isUrgent = announcement.priority === 'Critical' || announcement.priority === 'High';

    return (
        <div className="min-h-screen pb-20 space-y-8 md:space-y-16">
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
                                <Link href="/user/announcements" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Announcements
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-red-600 italic max-w-[150px] truncate">{announcement.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Minimalist Content Section */}
            <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 md:space-y-10">
                {/* Header Information */}
                <div className="space-y-4 md:space-y-6 pb-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic shadow-sm ${priorityColors[announcement.priority as keyof typeof priorityColors]}`}>
                            {announcement.priority} Priority
                        </div>
                        <span className="px-4 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                            <Tag className="w-3.5 h-3.5 text-red-600" />
                            {announcement.category}
                        </span>
                        {announcement.isPinned && (
                            <span className="px-4 py-1.5 bg-yellow-400 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 italic">
                                <Pin className="w-3.5 h-3.5" />
                                Pinned
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight pt-2 pb-1">
                        {announcement.title}
                    </h1>

                    <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-white dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-red-50 dark:bg-red-950/30 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">Date Posted</span>
                                <span className="text-[8px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic truncate">
                                    {format(new Date(announcement.createdAt), "MMM d, yyyy")}
                                </span>
                            </div>
                        </div>

                        {announcement.barangay && (
                            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-white dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 dark:bg-blue-950/30 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                    <Megaphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">Target Area</span>
                                    <span className="text-[8px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic truncate">
                                        Brgy. {announcement.barangay}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    <div className="lg:col-span-8 space-y-8">
                        {announcement.imageUrl && (
                            <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 p-2 shadow-xl flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={announcement.imageUrl}
                                    alt={announcement.title}
                                    className="w-full max-h-[500px] object-contain rounded-2xl"
                                />
                            </div>
                        )}

                        <div className="prose prose-xl md:prose-2xl prose-slate dark:prose-invert max-w-none">
                            <p className="text-sm md:text-3xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed md:leading-[1.6] whitespace-pre-wrap">
                                {announcement.content}
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {/* Status Widget */}
                        <div className="p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
                            <div className="flex items-center gap-3">
                                {isUrgent ? (
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                ) : (
                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                )}
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Bulletin Status</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visibility</span>
                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                        Active
                                    </span>
                                </div>
                                {announcement.expiryDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expires</span>
                                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                            {format(new Date(announcement.expiryDate), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

