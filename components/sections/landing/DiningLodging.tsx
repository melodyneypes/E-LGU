"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Utensils, Bed, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CombinedItem {
    id: string;
    name: string;
    description: string | null;
    address: string;
    imageUrl: string | null;
    itemType: "kainan" | "tuluyan";
    type?: string; // for Accommodation
    cuisineType?: string; // for Dining
    reviews?: { rating: number }[];
}

interface DiningLodgingProps {
    items: CombinedItem[];
}

export function DiningLodging({ items }: DiningLodgingProps) {
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (!items || items.length === 0) return null;

    return (
        <section id="experience" className="pt-16 pb-8 md:pb-12 px-6 max-w-7xl mx-auto">
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                <div className="space-y-2 md:space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Kainan at Tuluyan
                    </h2>
                    <p className="text-xs md:text-base text-slate-500 font-medium italic max-w-xl line-clamp-2 md:line-clamp-none">
                        Discover the authentic flavors and premium retreats of Mapandan in one mixed experience.
                    </p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <Link href="/user/dining" className="flex-1 md:flex-none">
                        <Button className="w-full md:w-auto px-4 md:px-8 py-3 md:py-4 h-auto bg-primary hover:opacity-90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-[10px] flex items-center justify-center gap-2 md:gap-3 group/btn transition-all shadow-xl shadow-primary/25 active:scale-95">
                            <Utensils className="w-3 h-3 md:w-4 md:h-4" />
                            Kainan Hub
                        </Button>
                    </Link>
                    <Link href="/user/accommodation" className="flex-1 md:flex-none">
                        <Button className="w-full md:w-auto px-4 md:px-8 py-3 md:py-4 h-auto bg-primary hover:opacity-90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-[10px] flex items-center justify-center gap-2 md:gap-3 group/btn transition-all shadow-xl shadow-primary/25 active:scale-95">
                            <Bed className="w-3 h-3 md:w-4 md:h-4" />
                            Tuluyan & Resorts
                        </Button>
                    </Link>
                </div>
            </div>

            {isMobile ? (
                <div className="grid grid-cols-2 gap-3 mt-6">
                    {items.map((item) => (
                        <DiningCard key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "100px" }}
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                    }}
                    className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 md:mt-10 lg:mt-12"
                >
                    {items.map((item) => (
                        <DiningCard key={item.id} item={item} />
                    ))}
                </motion.div>
            )}
        </section>
    );
}

function DiningCard({ item }: { item: CombinedItem }) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);
    
    const isDining = item.itemType === "kainan";
    const CategoryIcon = isDining ? Utensils : Bed;
    const subCategory = isDining ? item.cuisineType : item.type;
    const detailHref = isDining ? `/user/dining/${item.id}` : `/user/accommodation/${item.id}`;

    return (
        <div>
            <Link href={detailHref}>
                <div className="group relative flex flex-col space-y-2 md:space-y-4 cursor-pointer">
                    <div className="relative aspect-[4/3] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm md:shadow-xl ring-1 ring-slate-200 dark:ring-white/5 transition-transform duration-500 group-hover:scale-[1.02] group-hover:ring-primary/40 bg-slate-100 dark:bg-slate-900">
                        {item.imageUrl ? (
                            <>
                                <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                                </div>
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 300px"
                                    loading="lazy"
                                    onLoad={() => setIsImageLoading(false)}
                                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${isImageLoading ? 'opacity-0 scale-105 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
                                />
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                                <CategoryIcon className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />
                            </div>
                        )}
                        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex flex-col items-start gap-1 md:gap-2">
                            <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-3 md:py-1 ${isDining ? 'bg-orange-500 text-white' : 'bg-primary text-white'} rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg`}>
                                <CategoryIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                {item.itemType}
                            </span>
                            {subCategory && (
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-3 md:py-1 bg-white/90 backdrop-blur-md rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-lg">
                                    {subCategory}
                                </span>
                            )}
                        </div>

                        {item.reviews && item.reviews.length > 0 && (
                            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 dark:bg-slate-900/80 backdrop-blur-md text-amber-400 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-wider shadow-lg border border-white/10 dark:border-white/5">
                                    <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-amber-400 text-amber-450 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
                                    <span>
                                        {(item.reviews.reduce((sum, r) => sum + r.rating, 0) / item.reviews.length).toFixed(1)}
                                    </span>
                                    <span className="text-slate-400 font-bold">({item.reviews.length})</span>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1 md:space-y-2 px-1">
                        <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                            {item.name}
                        </h3>
                        <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 min-w-[10px] md:min-w-[12px]" />
                            <span className="text-[8px] md:text-[10px] font-bold uppercase truncate">{item.address}</span>
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 md:line-clamp-2 leading-relaxed font-medium italic pt-0.5 md:pt-1">
                            {item.description}
                        </p>
                    </div>
                </div>
            </Link>
        </div>
    );
}
