"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Camera, Clock, Navigation, Wallet, Home, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DetailContent({ item }: { item: any }) {
    const hasMap = item.googleMapsUrl || (item.latitude && item.longitude);
    const mapQuery = item.latitude && item.longitude 
        ? `${item.latitude},${item.longitude}`
        : `${item.name}, ${item.address}, Mapandan, Pangasinan`;
    const publicMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    const hasQuickInfo = item.entranceFee || item.bestTimeToVisit;

    return (
        <div className="min-h-screen pb-20 space-y-4 md:space-y-10">
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
                                <Link href="/user/tourism" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Gallery
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[150px] truncate">{item.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Layout */}
            <div className={cn(
                "grid grid-cols-1 gap-6 md:gap-12 items-start px-4 md:px-0",
                hasMap ? "lg:grid-cols-12" : "lg:grid-cols-2 max-w-6xl mx-auto"
            )}>
                {/* Image Section */}
                <div className={hasMap ? "lg:col-span-5" : "w-full"}>
                    <div className={cn(
                        "relative rounded-3xl md:rounded-[3.5rem] overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 dark:bg-white/5 group",
                        hasMap ? "aspect-square sm:aspect-[4/5]" : "aspect-[16/10]"
                    )}>
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Camera className="w-16 h-16 text-slate-200 dark:text-white/10" />
                            </div>
                        )}

                        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-xl italic">
                                <Camera className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                Gallery 
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className={hasMap ? "lg:col-span-7 space-y-6 md:space-y-8 pt-2 md:pt-0" : "w-full space-y-8"}>
                    <div className="space-y-2 md:space-y-4">
                        <h1 className={cn(
                            "font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none",
                            hasMap ? "text-2xl md:text-5xl" : "text-4xl md:text-7xl"
                        )}>
                            {item.name}
                        </h1>
                        {item.address && (
                            <div className="flex items-center gap-2 text-primary">
                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest italic">{item.address}</span>
                            </div>
                        )}
                    </div>

                    {item.description && (
                        <p className={cn(
                            "text-xs md:text-lg text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed",
                            hasMap ? "max-w-2xl" : "max-w-4xl"
                        )}>
                            {item.description}
                        </p>
                    )}

                    {/* Google Maps Section - Only if Map Data Exists */}
                    {hasMap && (
                        <motion.div 
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4 pt-4"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Location Map</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                        <Navigation className="w-3 h-3 text-primary" />
                                        Navigate your way to {item.name}
                                    </p>
                                </div>
                                <Link href={item.googleMapsUrl || `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}`} target="_blank">
                                    <Button className="bg-primary text-white hover:bg-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 px-6 h-10 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 w-full sm:w-auto">
                                        <Navigation className="w-3.5 h-3.5" />
                                        Get Directions
                                    </Button>
                                </Link>
                            </div>
                            
                            <div className="h-[250px] md:h-[350px] w-full rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 group relative">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={publicMapUrl}
                                    allowFullScreen
                                    loading="lazy"
                                ></iframe>
                                <div className="absolute inset-0 pointer-events-none ring-inset ring-1 ring-white/10 rounded-[2rem]" />
                            </div>
                        </motion.div>
                    )}

                    {/* Quick Info Grid - Only if data exists */}
                    {hasQuickInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                            {item.entranceFee && (
                                <div className="p-4 md:p-8 bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-all hover:border-primary/20 group">
                                    <div className="flex items-center gap-2 md:gap-3 text-primary">
                                        <Wallet className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                        <h3 className="text-[8px] md:text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Entrance Fee</h3>
                                    </div>
                                    <p className="text-[10px] md:text-base font-bold text-slate-500 italic">{item.entranceFee}</p>
                                </div>
                            )}

                            {item.bestTimeToVisit && (
                                <div className="p-4 md:p-8 bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-all hover:border-primary/20 group">
                                    <div className="flex items-center gap-2 md:gap-3 text-primary">
                                        <Clock className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                        <h3 className="text-[8px] md:text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Best Time</h3>
                                    </div>
                                    <p className="text-[10px] md:text-base font-bold text-slate-500 italic">{item.bestTimeToVisit}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!!item.contactNumber && (
                        <div className="space-y-3 md:space-y-4 pt-2">
                            <h3 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Inquiries & Contact</h3>
                            <Link href={`tel:${item.contactNumber}`} className="block w-fit">
                                <Button variant="outline" className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-[2rem] border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center gap-3 md:gap-4 shadow-sm hover:border-primary transition-all">
                                    <Phone className="w-3.5 h-3.5 md:w-5 md:h-5 text-primary" />
                                    {item.contactNumber}
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
