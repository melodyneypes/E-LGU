"use client";

import React from "react";
import { motion } from "framer-motion";
import { Newspaper, Calendar, Bell, ArrowRight, Clock, MapPin, Tag, User } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserBreadcrumb } from "@/components/shared/UserBreadcrumb";

// Barangay selecting provider import
import { useBarangay } from "@/components/providers/BarangayProvider";

// Main View Component
export function UserUpdatesView({ initialNews = [], initialEvents = [] }: { initialNews: any[], initialEvents: any[] }) {
    const { selectedBarangay } = useBarangay();

    const filteredNews = React.useMemo(() => {
        if (selectedBarangay === "All") {
            return initialNews.filter((n: any) => !n.barangay);
        }
        return initialNews.filter((n: any) => n.barangay === selectedBarangay);
    }, [initialNews, selectedBarangay]);

    const filteredEvents = React.useMemo(() => {
        if (selectedBarangay === "All") {
            return initialEvents.filter((e: any) => !e.barangay);
        }
        return initialEvents.filter((e: any) => e.barangay === selectedBarangay);
    }, [initialEvents, selectedBarangay]);

    const featuredNews = filteredNews.length > 0 ? filteredNews[0] : null;
    const remainingNews = filteredNews.slice(1);
    return (
        <div className="space-y-12 pb-20">
            <UserBreadcrumb />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
                            <Bell className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Civic Updates</h1>
                    </div>
                    <p className="text-slate-500 font-medium italic max-w-xl">
                        Stay informed with the latest official bulletins, community stories, and upcoming celebrations in our municipality.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="news" className="space-y-10">
                <TabsList className="bg-slate-100 dark:bg-white/5 p-1 h-16 rounded-2xl w-full sm:w-auto">
                    <TabsTrigger value="news" className="h-full px-8 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Newspaper className="w-4 h-4 mr-2" />
                        Latest News
                    </TabsTrigger>
                    <TabsTrigger value="events" className="h-full px-8 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Calendar className="w-4 h-4 mr-2" />
                        Community Events
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="news" className="space-y-12 outline-none">
                    {/* Featured Article */}
                    {featuredNews && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative aspect-auto md:aspect-[21/9] min-h-[500px] md:min-h-0 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden group cursor-pointer shadow-2xl"
                        >
                            <Image
                                src={featuredNews.imageUrl || "https://images.unsplash.com/photo-150471142745a-5099af501997?auto=format&fit=crop&q=80&w=1200"}
                                alt={featuredNews.title}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                            
                             <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 z-20">
                                <div className="space-y-4 max-w-2xl">
                                    <span className="inline-block px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg italic">Featured Bulletin</span>
                                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight">{featuredNews.title}</h2>
                                    <p className="text-slate-200 md:text-slate-300 font-medium italic line-clamp-2 text-base md:text-lg">{featuredNews.content}</p>
                                </div>
                                <Button className="h-16 px-10 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2 group/btn shrink-0">
                                    Read Full Story
                                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
                        {remainingNews.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white dark:bg-[#0a0c10] rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col group hover:border-blue-600 transition-all"
                            >
                                <div className="relative aspect-video overflow-hidden">
                                    <Image
                                        src={item.imageUrl || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800"}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-md flex items-center gap-1.5">
                                            <Tag className="w-3 h-3 text-blue-600" />
                                            Updates
                                        </span>
                                    </div>
                                </div>
                                
                                 <div className="p-8 space-y-4 flex-1 flex flex-col">
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {format(new Date(item.publishDate), "MMM d, yyyy")}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest">
                                            <User className="w-3.5 h-3.5" />
                                            Admin
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight italic">
                                        {item.title}
                                    </h3>
                                    
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic line-clamp-3 leading-relaxed flex-1">
                                        {item.content}
                                    </p>
                                    
                                    <Button variant="link" className="p-0 h-auto self-start text-primary font-black uppercase tracking-widest flex items-center gap-2 group/read">
                                        Read Story
                                        <ArrowRight className="w-4 h-4 group-hover/read:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="events" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {filteredEvents.map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                className="bg-white dark:bg-[#0a0c10] rounded-[3rem] p-4 flex flex-col md:flex-row gap-8 border border-slate-100 dark:border-white/5 shadow-2xl hover:border-blue-500 transition-all group overflow-hidden"
                            >
                                <div className="relative aspect-[16/10] md:aspect-square md:w-[240px] rounded-[2rem] overflow-hidden shrink-0">
                                    <Image
                                        src={event.imageUrl || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800"}
                                        alt={event.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-14 h-16 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
                                        <span className="text-[10px] font-black uppercase text-primary leading-none mb-1">{new Date(event.startDate).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-xl font-black text-slate-900 leading-none italic">{new Date(event.startDate).getDate()}</span>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex flex-col justify-center py-4 pr-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-primary/10 dark:bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">{event.category || "General Event"}</span>
                                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {event.time || "8:00 AM"}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-blue-600 transition-colors mb-4">{event.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic mb-6 line-clamp-2">{event.description}</p>
                                    
                                     <div className="flex items-center gap-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors mb-8">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{event.location}</span>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <Button className="flex-1 h-14 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn shadow-xl shadow-primary/10">
                                            Get Schedule
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {filteredEvents.length === 0 && (
                        <div className="py-20 text-center opacity-50 italic flex flex-col items-center gap-4">
                            <Calendar className="w-16 h-16 text-slate-300" />
                            <p className="font-black uppercase tracking-widest text-xs">No upcoming events scheduled</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
