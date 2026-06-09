"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Church, Clock, TrendingUp, Download, MapPin, Globe, CalendarDays, Heart, Info } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ParishCornerProps {
    info: any;
    schedules: any[];
    collections: any[];
}

export function ParishCorner({ info, schedules, collections }: ParishCornerProps) {
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const groupedSchedules = React.useMemo(() => {
        const result: { day: string, slots: any[], isPriority: boolean }[] = [];

        // Group by Day and Priority
        schedules.forEach(s => {
            const isPriority = (s.prio || 0) > 0;
            const dayKey = s.date ? format(new Date(s.date), "MMMM dd, yyyy") : s.day;

            const existing = result.find(g => g.day === dayKey && g.isPriority === isPriority);
            if (existing) {
                existing.slots.push(s);
            } else {
                result.push({ day: dayKey, slots: [s], isPriority });
            }
        });

        // internal sort slots by prio
        result.forEach(g => {
            g.slots.sort((a, b) => (b.prio || 0) - (a.prio || 0));
        });

        const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        return result.sort((a, b) => {
            // Global Priority First
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const idxA = dayOrder.indexOf(a.day);
            const idxB = dayOrder.indexOf(b.day);

            if (idxA !== -1 && idxB !== -1) {
                return idxA - idxB;
            }
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });
    }, [schedules]);

    if (!info) return null;

    const latest = collections[0];

    const leftContent = (
        <div className="bg-white dark:bg-[#111827] rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden p-6 md:p-10 ring-1 ring-slate-200 dark:ring-white/5 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 md:w-6 md:h-6" style={{ color: info.themeColor || '#2563eb' }} />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Mass Schedule</h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Schedule Highlights</span>
            </div>

            <div className="space-y-4 md:space-y-6 max-h-[500px] overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
                {groupedSchedules.length > 0 ? (
                    <div className="space-y-4 md:space-y-6">
                        {groupedSchedules.map((group, idx) => (
                            <div key={idx} className="md:bg-slate-50 md:dark:bg-white/5 md:rounded-[2rem] md:border border-slate-100 dark:border-white/5 overflow-hidden border-b md:border-b border-slate-100 dark:border-white/10 last:border-b-0 pb-4 md:pb-0">
                                <div className="md:bg-slate-100 md:dark:bg-white/5 px-2 md:px-6 py-2 md:py-3 flex items-center justify-between md:border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-3 h-3" style={group.isPriority ? { color: '#f59e0b' } : { color: info.themeColor || '#2563eb' }} />
                                        <span className={`text-[10px] font-black uppercase italic tracking-widest ${group.isPriority ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                            {group.day} {group.isPriority ? '• Priority' : ''}
                                        </span>
                                        {(group.day === format(new Date(), "MMMM dd, yyyy") || group.day === format(new Date(), "EEEE")) ? (
                                            <span className="ml-2 px-2 py-0.5 text-[8px] font-black text-white rounded-md tracking-tighter" style={{ backgroundColor: info.themeColor || '#2563eb' }}>TODAY</span>
                                        ) : null}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 italic"> GUIDE</span>
                                </div>
                                <div className="px-2 md:px-6 pt-3 pb-2 md:py-6 space-y-4 md:space-y-4">
                                    {group.slots.map((s: any, sIdx: number) => (
                                        <div key={sIdx} className="relative pl-5 md:pl-6 border-l-2 border-blue-600/20 last:border-0 pb-2">
                                            <div className="absolute top-0 left-[-5px] w-2 h-2 rounded-full bg-blue-600" />
                                            <div className="flex flex-row items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{s.time}</p>
                                                    <div className="flex md:hidden items-center gap-2">
                                                        <span className="text-[9px] font-black uppercase tracking-widest italic" style={{ color: info.themeColor || '#2563eb' }}>{s.language || "English"}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{s.type || "Mass"}</span>
                                                    </div>
                                                </div>
                                                <div className="hidden md:flex flex-col items-end gap-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest italic" style={{ color: info.themeColor || '#2563eb' }}>{s.language || "English"}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{s.type || "Mass"}</span>
                                                </div>
                                            </div>
                                            {s.description && (
                                                <div className="flex items-start gap-1.5 opacity-80 mt-1">
                                                    <Info className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic font-medium leading-relaxed">{s.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No schedules posted yet.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic pr-4">General mass schedules subject to change on holidays.</p>
                <Globe className="w-3 h-3 md:w-4 md:h-4 text-slate-300 shrink-0" />
            </div>
        </div>
    );

    const rightContent = (
        <div className="space-y-6 h-full">
            {/* Main Collection Card */}
            <div className="bg-primary rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white shadow-2xl shadow-primary/25 relative overflow-hidden group h-full">
                {/* Decorative patterns */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="relative z-10 space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-200" />
                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-white">Collection</h3>
                        </div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 italic">Weekly Report</span>
                    </div>

                    {latest ? (
                        <div className="space-y-3 md:space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 opacity-80">Week ending {format(new Date(latest.date), "MMMM dd, yyyy")}</p>
                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                    <span className="text-5xl md:text-6xl font-black tracking-tighter italic">₱{latest.totalAmount.toLocaleString()}</span>
                                    <span className="text-emerald-100 font-bold italic opacity-60 uppercase text-[9px] md:text-[10px] tracking-widest">Total Amount</span>
                                </div>
                            </div>

                            {/* Sunday Mass Breakdown */}
                            <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 italic">Sunday Masses ({format(new Date(latest.date), "MMM dd")})</p>
                                    <p className="text-xs font-black italic">₱{(latest.sundayMassJson as any[]).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 md:gap-3">
                                    {(latest.sundayMassJson as any[]).map((m, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] font-bold italic opacity-80 bg-white/5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl">
                                            <span>{m.time}</span>
                                            <span>₱{Number(m.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Other Sources */}
                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                                <div className="p-3 md:p-4 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-sm border border-white/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100 mb-0.5 md:mb-1 italic">2nd Basket</p>
                                    <p className="text-lg md:text-xl font-bold italic">₱{Number(latest.secondBasket).toLocaleString()}</p>
                                </div>
                                <div className="p-3 md:p-4 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-sm border border-white/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100 mb-0.5 md:mb-1 italic">Envelopes</p>
                                    <p className="text-lg md:text-xl font-bold italic">₱{Number(latest.envelopes).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Donation Summary if any */}
                            {(latest.donationsJson as any[]).length > 0 && (
                                <div className="p-3 md:p-4 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-sm border border-white/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100 mb-0.5 md:mb-1 italic">Generous Donations</p>
                                    <p className="text-lg md:text-xl font-bold italic">₱{(latest.donationsJson as any[]).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-6 md:py-10 text-center border border-dashed border-white/20 rounded-2xl">
                            <p className="text-emerald-100 font-bold italic text-xs md:text-base">No financial data available yet.</p>
                        </div>
                    )}

                    <div className="pt-3 md:pt-4 flex items-center justify-between border-t border-white/10">
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Heart className="w-4 h-4 text-white fill-white" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest italic">God loves a cheerful giver.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <section id="church" className="pt-0 md:pt-12 pb-12 md:pb-12 px-6 bg-white dark:bg-slate-950 relative">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 relative z-30 sticky md:static top-[70px] md:top-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-16">
                    <div className="space-y-2 md:space-y-4 w-full">
                        <div className="flex items-center gap-3">
                            <div className="p-2 md:p-3 rounded-2xl shadow-lg" style={{ backgroundColor: info.themeColor || '#2563eb', boxShadow: `0 10px 15px -3px ${info.themeColor}33` }}>
                                <Church className="w-6 h-6 md:w-8 md:h-8 text-white" />
                            </div>
                            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                Church Information
                            </h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-xl text-xs md:text-lg leading-relaxed">
                            Welcome to the <span className="text-slate-900 dark:text-white font-black">{info.name}</span> stewardship and information hub.
                            Stay connected with our community through mass schedules and financial reports.
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 relative z-10">

                    {/* LEFT SIDE: Mass Schedule */}
                    {isMobile ? (
                        <div>{leftContent}</div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            {leftContent}
                        </motion.div>
                    )}

                    {/* RIGHT SIDE: Collections / Transparency */}
                    {isMobile ? (
                        <div>{rightContent}</div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            {rightContent}
                        </motion.div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 w-full pt-6 md:pt-10">
                    <Button asChild className="w-full md:w-[400px] px-8 py-3.5 md:py-5 h-auto bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-[2rem] transition-all shadow-xl shadow-primary/25 active:scale-95 group flex items-center justify-center gap-2 md:gap-3 border-none">
                        <Link href="/user/church">
                            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
                            Learn more about the Parish
                        </Link>
                    </Button>

                    {!!info.flyerUrl && (
                        <a
                            href={info.flyerUrl || null as any}
                            download
                            className="w-full md:w-[400px] flex items-center justify-center gap-2 md:gap-3 px-8 py-3.5 md:py-5 text-white rounded-[2rem] font-black uppercase italic tracking-widest text-[9px] md:text-[10px] transition-all shadow-xl group"
                            style={{ backgroundColor: info.themeColor || '#2563eb', boxShadow: `0 10px 15px -3px ${info.themeColor}4d` }}
                        >
                            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:bounce transition-transform" />
                            <span>Download Weekly Flyer</span>
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ParishCorner;
