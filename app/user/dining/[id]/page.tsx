import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Utensils, Navigation, Home } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ContactButtons } from "./ContactButtons";

export default async function DiningDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const item = await prisma.dining.findUnique({
        where: { id }
    });

    if (!item || !item.isPublished) {
        notFound();
    }

    // Map implementation without API key
    const mapQuery = item.latitude && item.longitude
        ? `${item.latitude},${item.longitude}`
        : `${item.name}, ${item.address}, Mapandan, Pangasinan`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAP_KEY_PLACEHOLDER || ''}&q=${encodeURIComponent(mapQuery)}`;
    // Fallback public embed if no key:
    const publicMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className="min-h-screen pb-20 space-y-10">
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
                                <Link href="/user/dining" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    Dining Hub
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

            {/* Compact Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10 items-start">
                {/* Smaller Image Column */}
                <div className="lg:col-span-2">
                    <div className="relative aspect-video sm:aspect-[4/5] rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-xl md:shadow-2xl ring-1 ring-slate-200 dark:ring-white/5">
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                                <Utensils className="w-16 h-16 text-slate-200" />
                            </div>
                        )}
                        <div className="absolute top-4 left-4">
                            <span className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
                                Kainan
                            </span>
                        </div>
                    </div>
                </div>

                {/* Larger Details Column */}
                <div className="lg:col-span-3 space-y-6 md:space-y-8">
                    <div className="space-y-2 md:space-y-3">
                        <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                            {item.name}
                        </h1>
                        <div className="flex items-center gap-2 text-primary">
                            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest italic">{item.address}</span>
                        </div>
                    </div>

                    <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                        {item.description}
                    </p>

                    {/* Smaller Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="p-4 md:p-5 bg-white dark:bg-white/5 rounded-2xl md:rounded-[2rem] space-y-1.5 md:space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-all hover:border-primary/20 group">
                            <div className="flex items-center gap-2 text-primary">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Opening Hours</h3>
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 italic">{item.openingHours || "Contact establishment"}</p>
                        </div>

                        <div className="p-4 md:p-5 bg-white dark:bg-white/5 rounded-2xl md:rounded-[2rem] space-y-1.5 md:space-y-2 border border-slate-200 dark:border-white/10 shadow-md transition-all hover:border-primary/20 group">
                            <div className="flex items-center gap-2 text-primary">
                                <Utensils className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Cuisine</h3>
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 italic">{item.cuisineType || "Local"}</p>
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4 pt-2">
                        <h3 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Connect with Establishment</h3>
                        <ContactButtons
                            contactNumber={item.contactNumber}
                            facebookUrl={item.facebookUrl}
                        />
                        <ContactButtons
                            contactNumber={item.contactNumber}
                            facebookUrl={item.facebookUrl}
                            isMobile={true}
                        />
                    </div>

                    {/* Shorter Map Section - Always visible */}
                    <div className="space-y-3 md:space-y-4 pt-2 md:pt-4 relative group/map">
                        <div className="h-[200px] md:h-[300px] w-full rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-lg md:shadow-xl ring-1 ring-slate-200 dark:ring-white/5 bg-slate-100 relative">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={publicMapUrl}
                                allowFullScreen
                                loading="lazy"
                            ></iframe>

                            {/* Floating Directions Button - Fixed and visible */}
                            {item.googleMapsUrl && item.googleMapsUrl !== "" && (
                                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
                                    <Link href={item.googleMapsUrl || null as any} target="_blank">
                                        <Button className="bg-primary text-white rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[9px] flex items-center gap-1.5 md:gap-2 px-4 md:px-6 h-8 md:h-10 shadow-lg md:shadow-2xl">
                                            <Navigation className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                            Get Directions
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

