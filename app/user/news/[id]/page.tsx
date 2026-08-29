import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Calendar, User, Home, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ActionButtons from "./ActionButtons";
import Gallery from "./Gallery";
import { getSystemSetting } from "@/lib/settings";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const news = await prisma.news.findUnique({
        where: { id }
    });

    if (!news) {
        notFound();
    }

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

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
                                <Link href="/user/news" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    News
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic max-w-[150px] truncate" style={{ color: themeColor }}>{news.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-4 md:px-0 space-y-8 md:space-y-12">
                
                {/* Meta details header card */}
                <div className="space-y-6 bg-white dark:bg-[#0f111a] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border" 
                             style={{ backgroundColor: `${themeColor}12`, color: themeColor, borderColor: `${themeColor}30` }}>
                            Official Press Release
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                            <Tag className="w-3.5 h-3.5" />
                            {news.category}
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        {news.title}
                    </h1>

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-[#2a3040] pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Author & Date Row */}
                        <div className="flex items-center gap-6">
                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Author</span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white" style={{ color: themeColor }}>
                                        {news.author || "Municipal Office"}
                                    </span>
                                </div>
                            </div>

                            {/* Vertical Separator */}
                            <div className="h-8 border-l border-slate-200 dark:border-[#2a3040] hidden sm:block" />

                            {/* Date */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0">
                                    <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Published Date</span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {format(new Date(news.publishDate), "MMMM d, yyyy")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Share Actions Row */}
                        <div className="flex items-center gap-4 border-t border-slate-100 dark:border-[#2a3040] pt-4 md:pt-0 md:border-none">
                            <ActionButtons />
                        </div>
                    </div>
                </div>

                {/* Main Featured Image */}
                {news.imageUrl && (
                    <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1a1f2e]">
                        <Image
                            src={news.imageUrl}
                            alt={news.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}

                {/* Grid Layout: Content + Gallery */}
                <div className="space-y-8 md:space-y-12">
                    <div className="prose prose-xl dark:prose-invert max-w-none">
                        <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed md:leading-[1.8] whitespace-pre-wrap">
                            {news.content}
                        </p>
                    </div>

                    {/* Interactive Lightbox Gallery */}
                    <Gallery images={news.images} themeColor={themeColor} />
                </div>
            </div>
        </div>
    );
}

