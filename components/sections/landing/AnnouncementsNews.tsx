"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
 
import { Megaphone, Newspaper, Tag, Pin, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useBarangay } from "@/components/providers/BarangayProvider";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    category: string;
    isPinned: boolean;
    createdAt: Date;
}

interface News {
    id: string;
    title: string;
    content: string;
    imageUrl: string | null;
    publishDate: Date;
    category: string;
    author: string | null;
}

interface AnnouncementsNewsProps {
    announcements: Announcement[];
    news: News[];
}

export function AnnouncementsNews({ announcements, news }: AnnouncementsNewsProps) {
    const { selectedBarangay } = useBarangay();
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const filteredAnnouncements = announcements;
    const filteredNews = news;

    return (
        <section id="news" className="pt-8 md:pt-12 pb-8 md:pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left Column: Public Announcements */}
            <div className="flex flex-col h-full">
                <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-4 md:mb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
                            <Megaphone className="w-5 h-5 md:w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Citizens Broadcast</span>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Announcements</h2>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:gap-4 mt-2 md:mt-8">
                    {filteredAnnouncements.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-12 text-center">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No urgent notices for this area.</p>
                        </div>
                    ) : (
                        filteredAnnouncements.map((item, idx) => (
                            <AnnouncementCard key={item.id} item={item} idx={idx} isMobile={isMobile} />
                        ))
                    )}
                </div>
                
                <Link href={selectedBarangay !== "All" ? `/user/announcements?barangay=${selectedBarangay}` : "/user/announcements"} className="mt-auto pt-6 md:pt-8">
                    <Button className="w-full py-4 h-auto bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] transition-all shadow-xl shadow-primary/25 active:scale-95 flex items-center justify-center gap-3">
                        <Megaphone className="w-4 h-4" />
                        Archived Broadcasts
                    </Button>
                </Link>
            </div>

            {/* Right Column: Latest News */}
            <div className="flex flex-col h-full mt-8 lg:mt-0">
                <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-4 md:mb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
                            <Newspaper className="w-5 h-5 md:w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Municipality News</span>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Latest Stories</h2>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 mt-2 md:mt-8">
                    {filteredNews.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-12 text-center">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No news updates for this area.</p>
                        </div>
                    ) : (
                        filteredNews.map((item, idx) => (
                            <NewsCard key={item.id} item={item} idx={idx} isMobile={isMobile} />
                        ))
                    )}
                </div>

                <Link href={selectedBarangay !== "All" ? `/user/news?barangay=${selectedBarangay}` : "/user/news"} className="mt-auto pt-6 md:pt-8">
                    <Button className="w-full py-4 h-auto bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-3 group">
                        <Newspaper className="w-4 h-4" />
                        Explore All Stories
                    </Button>
                </Link>
            </div>
        </section>
    );
}

function AnnouncementCard({ item, idx, isMobile }: { item: Announcement; idx: number; isMobile: boolean }) {
    const cardClasses = "group bg-slate-50 dark:bg-white/5 rounded-3xl md:rounded-[2rem] p-5 md:p-6 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden";

    const content = (
        <>
            <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {item.isPinned && (
                            <span className="bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 md:px-3 rounded-full flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" />
                                Pinned
                            </span>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 md:px-3 rounded-full border ${
                            item.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' :
                            item.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-primary/10 text-primary border-primary/20'
                        }`}>
                            {item.priority} Priority
                        </span>
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                        {format(new Date(item.createdAt), "MMM d")}
                    </span>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic line-clamp-2">
                        {item.content}
                    </p>
                </div>
                <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Tag className="w-3 h-3 text-primary font-bold" />
                    {item.category}
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        </>
    );

    if (isMobile) {
        return (
            <Link href={`/user/announcements/${item.id}`} className="block">
                <div className={cardClasses}>
                    {content}
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/user/announcements/${item.id}`} className="block">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.1 }}
                className={cardClasses}
            >
                {content}
            </motion.div>
        </Link>
    );
}

function NewsCard({ item, idx, isMobile }: { item: News; idx: number; isMobile: boolean }) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);

    const cardClasses = "flex flex-row items-center gap-3 md:gap-6 group cursor-pointer bg-white dark:bg-[#0f1117] p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 dark:border-[#2a3040] hover:border-primary transition-all shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden";

    const content = (
        <>
            <div className="relative w-20 h-20 min-w-[5rem] md:min-w-[140px] md:w-auto md:h-32 rounded-xl md:rounded-2xl overflow-hidden shadow-md md:shadow-2xl shadow-primary/10 border border-slate-200 dark:border-white/10 shrink-0 ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 dark:bg-slate-900">
                <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
                <Image
                    src={item.imageUrl || "/news/default.png"}
                    alt={item.title}
                    fill
                    loading="lazy"
                    onLoad={() => setIsImageLoading(false)}
                    className={cn(
                        "object-cover transition-all duration-700",
                        isImageLoading ? 'opacity-0 blur-sm scale-110' : 'opacity-100 blur-0 scale-100',
                        "group-hover:scale-110"
                    )}
                />
                <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors z-20" />
            </div>
            <div className="space-y-1 md:space-y-2 relative z-10 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
                    <div className="flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <Calendar className="w-2 md:w-2.5 h-2 md:h-2.5" />
                        {format(new Date(item.publishDate), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Tag className="w-2 md:w-2.5 h-2 md:h-2.5" />
                        {item.category}
                    </div>
                </div>
                <h3 className="text-sm md:text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                </h3>
                <div className="flex items-center justify-between gap-4">
                    <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-medium italic line-clamp-2">
                        {item.content}
                    </p>
                    <div className="hidden md:flex w-10 h-10 bg-primary/10 rounded-full items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                        <Megaphone className="w-5 h-5" />
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors pointer-events-none" />
        </>
    );

    if (isMobile) {
        return (
            <Link href={`/user/news/${item.id}`} className="block">
                <div className={cardClasses}>
                    {content}
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/user/news/${item.id}`} className="block">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cardClasses}
            >
                {content}
            </motion.div>
        </Link>
    );
}
