import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, Clock, Navigation, Home, BellRing, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { EventContactButton } from "./EventContactButton";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const item = await prisma.event.findUnique({
        where: { id }
    });

    if (!item || !item.isPublished) {
        notFound();
    }

    const hasMap = item.googleMapsUrl || (item.latitude && item.longitude);
    const mapQuery = item.latitude && item.longitude
        ? `${item.latitude},${item.longitude}`
        : `${item.title}, ${item.venueName}, Municipality of E-LGU`;
    const publicMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

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
                                <Link href="/user/events" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Events
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden sm:block" />
                        <BreadcrumbItem className="hidden sm:block">
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[150px] truncate">{item.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12 items-start px-4 md:px-0">
                {/* Image Column */}
                <div className="lg:col-span-5 space-y-4 md:space-y-6">
                    <div className="relative aspect-square sm:aspect-[4/5] rounded-3xl md:rounded-[3.5rem] overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 dark:bg-white/5 group">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Calendar className="w-16 h-16 text-slate-200 dark:text-white/10" />
                            </div>
                        )}

                        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-xl italic">
                                <Tag className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                {item.category}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Details Column */}
                <div className="lg:col-span-7 space-y-6 md:space-y-10">
                    {/* Title & Venue */}
                    <div className="space-y-3 md:space-y-4">
                        <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                            {item.title}
                        </h1>
                        <div className="flex items-center gap-2 text-slate-400 group">
                            <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </div>
                            <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest italic group-hover:text-primary transition-colors">
                                {item.venueName} • {item.address}
                            </span>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="h-[2px] w-8 bg-primary rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">About this event</h3>
                        </div>
                        <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed md:leading-loose">
                            {item.description || "No detailed description provided for this event."}
                        </p>
                    </div>

                    {/* Event Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                        <div className="p-4 md:p-8 bg-white dark:bg-white/5 rounded-2xl md:rounded-2xl space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-colors hover:border-primary/20 group">
                            <div className="flex items-center gap-2 md:gap-3 text-primary">
                                <Calendar className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                <h3 className="text-[8px] md:text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Date</h3>
                            </div>
                            <p className="text-[10px] md:text-base font-bold text-slate-500 italic">{format(new Date(item.startDate), "MMMM d, yyyy")}</p>
                        </div>

                        <div className="p-4 md:p-8 bg-white dark:bg-white/5 rounded-2xl md:rounded-2xl space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-colors hover:border-primary/20 group">
                            <div className="flex items-center gap-2 md:gap-3 text-primary">
                                <Clock className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                <h3 className="text-[8px] md:text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Time</h3>
                            </div>
                            <p className="text-[10px] md:text-base font-bold text-slate-500 italic">
                                {format(new Date(item.startDate), "h:mm a")} - {format(new Date(item.endDate), "h:mm a")}
                            </p>
                        </div>
                    </div>

                    {/* Reminders Section */}
                    {item.reminders && item.reminders.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <BellRing className="w-4 h-4 text-primary" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Reminders</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {item.reminders.map((reminder, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 md:p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl md:rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform" />
                                        <span className="text-[9px] md:text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest italic">
                                            {reminder}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contact Section */}
                    {item.contactNumber && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                            <h3 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Inquiries & Contact</h3>
                            <EventContactButton contactNumber={item.contactNumber} />
                        </div>
                    )}

                    {/* Map Section */}
                    {hasMap && (
                        <div className="space-y-6 pt-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Location Guide</h3>
                                <Link href={item.googleMapsUrl || `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}`} target="_blank">
                                    <Button variant="ghost" className="h-8 px-4 text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2 italic hover:bg-primary/5">
                                        <Navigation className="w-3.5 h-3.5" />
                                        Open in Maps
                                    </Button>
                                </Link>
                            </div>
                            <div className="relative h-[250px] md:h-[400px] w-full rounded-2xl md:rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 group/map">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={publicMapUrl}
                                    allowFullScreen
                                    loading="lazy"
                                    className="transition-all duration-700"
                                ></iframe>
                                <div className="absolute inset-0 pointer-events-none border-[12px] border-white/10 dark:border-white/5 rounded-2xl md:rounded-2xl z-10" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

