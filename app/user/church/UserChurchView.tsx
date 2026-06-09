"use client";

import { motion } from "framer-motion";
import { Church, Home, Clock, Download, TrendingUp, Info, Calendar, Navigation } from "lucide-react";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import * as React from "react";

import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserChurchViewProps {
    info: any;
    schedules: any[];
    collections: any[];
    availableBarangays?: string[];
    currentBarangay?: string;
}

export function UserChurchView({
    info,
    schedules = [],
    collections = [],
    availableBarangays = [],
    currentBarangay
}: UserChurchViewProps) {
    const router = useRouter();
    const latest = collections[0];
    const [selectedMonth, setSelectedMonth] = React.useState<string>("all");

    const onSectorChange = (val: string) => {
        if (val === "global") {
            router.push("/user/church");
        } else {
            router.push(`/user/church?barangay=${val}`);
        }
    };

    const availableMonths = React.useMemo(() => {
        const safeCollections = [...collections];
        const months = new Set<string>();
        safeCollections.forEach(c => months.add(format(new Date(c.date), "MMMM")));
        return Array.from(months).sort((a, b) => {
            const monthsOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            return monthsOrder.indexOf(a) - monthsOrder.indexOf(b);
        });
    }, [collections]);

    const filteredCollections = React.useMemo(() => {
        const safeCollections = [...collections];
        if (selectedMonth === "all") return safeCollections;
        return safeCollections.filter(c => format(new Date(c.date), "MMMM") === selectedMonth);
    }, [collections, selectedMonth]);

    const groupedSchedules = React.useMemo(() => {
        const result: { day: string, slots: any[], isPriority: boolean }[] = [];

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

        result.forEach(g => {
            g.slots.sort((a, b) => (b.prio || 0) - (a.prio || 0));
        });

        const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        return result.sort((a, b) => {
            // Priority First
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




    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0c10] pb-24">
            <div className="max-w-5xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-6 md:space-y-12">

                {/* Sticky Mobile Breadcrumbs */}
                <div className="sticky top-[64px] sm:top-[80px] z-40 bg-white/70 dark:bg-[#06080a]/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 -mx-4 px-4 py-3 md:hidden mb-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Home</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/user/church" className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Church</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            {info.barangay && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic truncate max-w-[120px]">{info.barangay}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Editorial Header */}
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <Breadcrumb className="hidden md:block">
                            <BreadcrumbList className="bg-slate-50 dark:bg-white/5 px-6 py-2 rounded-xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
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
                                        <Link href="/user/church" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">Spiritual</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {info.barangay && (
                                    <>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic">{info.barangay} Sector</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </>
                                )}
                            </BreadcrumbList>
                        </Breadcrumb>

                        {/* Sector Switcher UI */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-1.5 rounded-xl md:rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm w-full md:w-auto">
                            <div className="px-3 hidden md:block">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Context</p>
                            </div>
                            <Select value={currentBarangay || "global"} onValueChange={onSectorChange}>
                                <SelectTrigger className="w-full md:w-[220px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 rounded-lg md:rounded-xl font-black uppercase italic text-[9px] md:text-[10px] tracking-widest h-10 md:h-12 shadow-sm">
                                    <SelectValue placeholder="Select Parish Sector" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 rounded-xl">
                                    <SelectItem value="global" className="font-black uppercase italic text-[9px] md:text-[10px] tracking-widest cursor-pointer hover:text-primary">Mapandan Main Parish</SelectItem>
                                    {availableBarangays.map((b) => (
                                        <SelectItem key={b} value={b} className="font-black uppercase italic text-[9px] md:text-[10px] tracking-widest cursor-pointer hover:text-primary">
                                            Sector: {b}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[22px] flex items-center justify-center shadow-xl shadow-primary/10 shrink-0 transform -rotate-3" style={{ background: `linear-gradient(to bottom right, ${info.themeColor || '#2563eb'}, ${info.themeColor || '#1e40af'}dd)` }}>
                                    {info.barangay ? <Navigation className="w-6 h-6 md:w-8 md:h-8 text-white" /> : <Church className="w-6 h-6 md:w-8 md:h-8 text-white" />}
                                </div>
                                <div className="space-y-0.5">
                                    <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                                        {info.name || (info.barangay ? `${info.barangay} Sector` : "Holy Rosary Parish")}
                                    </h1>
                                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] ml-1 italic" style={{ color: info.themeColor || '#2563eb' }}>
                                        {info.barangay ? `Community Outreach • ${info.barangay}` : "The Mother Parish of Mapandan"}
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-2xl text-sm md:text-xl leading-relaxed">
                                The heartbeat of our spiritual community. Located at <span className="text-slate-900 dark:text-white font-black uppercase">{info.address}</span>.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {!!info.flyerUrl && (
                                <a href={info.flyerUrl || null as any} target="_blank" rel="noopener noreferrer" download className="flex-1 md:flex-none flex items-center justify-center gap-2.5 h-12 md:h-14 px-6 md:px-8 bg-primary text-white rounded-xl md:rounded-2xl font-black uppercase italic tracking-widest text-[9px] md:text-[10px] transition-all active:scale-95 shadow-xl shadow-primary/20">
                                    <Download className="w-4 h-4" />
                                    <span>Download Flyer</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                    {/* LEFT: Schedules (8 cols) */}
                    <div className="lg:col-span-8 lg:sticky lg:top-24 h-fit space-y-6 md:space-y-10">
                        <div className="bg-white dark:bg-[#0d0f14] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-4 md:p-10 shadow-2xl space-y-8 md:space-y-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Church className="w-32 h-32" /></div>

                            <div className="relative z-10 space-y-8 md:space-y-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Clock className="w-5 h-5" /></div>
                                        <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Mass Schedule</h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:gap-4">
                                    {groupedSchedules.map((group, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            viewport={{ once: true }}
                                            className={cn(
                                                "rounded-2xl md:rounded-3xl border transition-all overflow-hidden",
                                                group.isPriority
                                                    ? "bg-slate-950 border-white/10 ring-2 ring-primary/20"
                                                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5"
                                            )}
                                        >
                                            <div className={cn("px-5 md:px-8 py-2 md:py-3 flex items-center justify-between border-b", group.isPriority ? "bg-white/5 border-white/5" : "bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/5")}>
                                                <div className="flex items-center gap-3">
                                                    <Calendar className={cn("w-3.5 h-3.5", group.isPriority ? "text-primary" : "text-slate-400")} />
                                                    <span className={cn("text-[8px] md:text-[10px] font-black uppercase italic tracking-widest", group.isPriority ? "text-white" : "text-slate-900 dark:text-white")}>
                                                        {group.day} {group.isPriority ? '• Highlight' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 md:p-6 space-y-4">
                                                {group.slots.map((s, sIdx) => (
                                                    <div key={sIdx} className="flex flex-row items-center justify-between gap-3 group/slot py-2 border-b border-slate-50 dark:border-white/[0.02] last:border-0">
                                                        <div className="flex items-center gap-4">
                                                            <div className="space-y-0.5">
                                                                <p className={cn("text-xl md:text-4xl font-black italic tracking-tighter leading-none transition-colors", group.isPriority ? "text-white group-hover/slot:text-primary" : "text-slate-900 dark:text-white group-hover/slot:text-primary")}>
                                                                    {s.time}
                                                                </p>
                                                                {s.description && (
                                                                    <p className={cn("text-[8px] md:text-[10px] font-bold italic opacity-60 leading-tight uppercase tracking-tight hidden md:block", group.isPriority ? "text-slate-400" : "text-slate-500")}>
                                                                        {s.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right">
                                                                <span className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">{s.language || "English"}</span>
                                                                <span className={cn("block text-[7px] md:text-[9px] font-bold uppercase tracking-widest mt-0.5 italic", group.isPriority ? "text-white/30" : "text-slate-400")}>{s.type || "Holy Mass"}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Transparency (4 cols) */}
                    <div className="lg:col-span-4 space-y-6 md:space-y-10">
                        {/* Latest Collection Card */}
                        <Card className="p-6 md:p-10 border-none bg-slate-950 text-white shadow-2xl rounded-2xl md:rounded-[3rem] relative overflow-hidden group min-h-[500px] flex flex-col">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700"><TrendingUp className="w-24 h-24" /></div>

                            <div className="relative z-10 space-y-6 flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20"><Info className="w-4 h-4" /></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">Weekly Stewardship</h3>
                                </div>

                                {latest ? (
                                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                        <div className="space-y-1 shrink-0">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Week Ending {format(new Date(latest.date), "MMM d")}</p>
                                            <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">₱{latest.totalAmount.toLocaleString()}</p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Sunday Mass Detailed List */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic border-b border-white/10 pb-1">Sunday Masses</p>
                                                {(latest.sundayMassJson as any[]).map((m, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-[10px] font-bold italic opacity-80 bg-white/5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                                                        <span className="text-slate-400">{m.time}</span>
                                                        <span className="text-white">₱{Number(m.amount).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Secondary Breakdown Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic mb-1">2nd Basket</p>
                                                    <p className="text-sm font-black italic text-white">₱{Number(latest.secondBasket).toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Weekdays</p>
                                                    <p className="text-sm font-black italic text-white">₱{Number(latest.weekdays).toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic mb-1">Envelopes</p>
                                                    <p className="text-sm font-black italic text-white">₱{Number(latest.envelopes).toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 bg-primary/20 rounded-2xl border border-primary/20">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-primary italic mb-1">Total Fund</p>
                                                    <p className="text-sm font-black italic text-primary">₱{latest.totalAmount.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Donations List */}
                                            {(latest.donationsJson as any[]).length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic border-b border-white/10 pb-1">Special Donations</p>
                                                    {(latest.donationsJson as any[]).map((d, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[10px] font-bold italic opacity-80 bg-white/5 px-3 py-2 rounded-xl">
                                                            <span className="text-slate-400 truncate max-w-[120px]">{d.name || d.source || "Anonymous"}</span>
                                                            <span className="text-white">₱{Number(d.amount).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold italic opacity-50">Stewardship report incoming...</p>
                                )}
                            </div>

                            <div className="pt-6 border-t border-white/5 relative z-10 flex items-center justify-between shrink-0">
                                <p className="text-[8px] font-black uppercase tracking-widest text-primary italic">Live Transparency</p>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 italic">Official Record</span></div>
                            </div>
                        </Card>

                        {/* History Matrix */}
                        <div className="bg-white dark:bg-[#0d0f14] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-2xl flex flex-col max-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Financial Logs</h4>
                                <Badge className="bg-primary/10 text-primary text-[8px] font-black uppercase italic border-none">{filteredCollections.length} Logs</Badge>
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
                                <button onClick={() => setSelectedMonth("all")} className={cn("px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest italic transition-all shrink-0", selectedMonth === 'all' ? "bg-primary text-white" : "bg-slate-50 dark:bg-white/5 text-slate-400")}>All</button>
                                {availableMonths.map(month => (
                                    <button key={month} onClick={() => setSelectedMonth(month)} className={cn("px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest italic transition-all shrink-0", selectedMonth === month ? "bg-primary text-white" : "bg-slate-50 dark:bg-white/5 text-slate-400")}>{month}</button>
                                ))}
                            </div>

                            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                {filteredCollections.map((c) => {
                                    const sundayTotal = (c.sundayMassJson as any[])?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
                                    return (
                                        <div key={c.id} className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-between cursor-default border-b border-slate-50 dark:border-white/[0.02] last:border-0">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold text-slate-900 dark:text-slate-300">{format(new Date(c.date), "MMM dd, yyyy")}</p>
                                                <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Sun: ₱{sundayTotal.toLocaleString()}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Env: ₱{c.envelopes.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black italic tracking-tighter text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-none">₱{c.totalAmount.toLocaleString()}</p>
                                                <p className="text-[7px] font-black uppercase tracking-widest text-emerald-500 italic opacity-0 group-hover:opacity-100 transition-opacity">Validated</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interactive Map Block */}
                        <div className="relative h-[250px] md:h-[300px] bg-slate-100 dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden group">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://maps.google.com/maps?q=${info.latitude || 16.0354},${info.longitude || 120.4431}&hl=en&z=15&output=embed`}
                                className="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />

                            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white italic">Location</p>
                                    <p className="text-[11px] font-bold text-white/70 italic truncate max-w-[150px]">{info.address}</p>
                                </div>
                                {!!info.locationUrl && (
                                    <a href={info.locationUrl || null as any} target="_blank" className="flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-xl font-black uppercase italic tracking-widest text-[9px] transition-all hover:scale-105 shadow-xl shadow-primary/40">
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span>Route</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

