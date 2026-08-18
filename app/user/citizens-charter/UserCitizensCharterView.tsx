"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
    FileText, Search, Home, ExternalLink, BookOpen, Leaf,
    Calculator, Gavel, FileCheck, Shield, HeartPulse, Hammer, Siren, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import Link from "next/link";

interface CitizenCharter {
    id: string;
    officeName: string;
    fileUrl: string;
    isActive: boolean;
}

export function UserCitizensCharterView({ initialCharters = [] }: { initialCharters: CitizenCharter[] }) {
    const [search, setSearch] = useState("");

    // Dynamic Lucide icon helper based on office name
    const getOfficeIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("agri")) return Leaf;
        if (lower.includes("account") || lower.includes("budget") || lower.includes("treasur") || lower.includes("finance")) return Calculator;
        if (lower.includes("bid") || lower.includes("award")) return Gavel;
        if (lower.includes("permit") || lower.includes("license") || lower.includes("bplo")) return FileCheck;
        if (lower.includes("registrar") || lower.includes("registry") || lower.includes("lcr")) return BookOpen;
        if (lower.includes("admin") || lower.includes("mayor") || lower.includes("executive")) return Shield;
        if (lower.includes("health") || lower.includes("rhu") || lower.includes("clinic") || lower.includes("medic")) return HeartPulse;
        if (lower.includes("engineer") || lower.includes("building") || lower.includes("construction")) return Hammer;
        if (lower.includes("police") || lower.includes("security") || lower.includes("poso") || lower.includes("fire") || lower.includes("siren")) return Siren;
        return FileText;
    };

    const filtered = initialCharters.filter(c => 
        c.officeName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-12 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            {/* Breadcrumbs */}
            <Breadcrumb>
                <BreadcrumbList className="bg-white/50 dark:bg-white/5 backdrop-blur-sm px-6 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
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
                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[200px] truncate">Citizens Charter</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 dark:border-white/5 pb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl text-white animate-pulse"
                            style={{ backgroundColor: 'var(--primary-theme)', boxShadow: '0 20px 25px -5px color-mix(in srgb, var(--primary-theme) 40%, transparent)' }}
                        >
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Citizens Charter</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-xl text-sm sm:text-base leading-relaxed">
                        Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018). Step-by-step procedures, requirements, fees, and processing times for municipal services.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search municipal office..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-11 h-12 border-slate-200 dark:border-white/10 rounded-2xl dark:bg-[#0c101b] text-xs font-bold italic shadow-sm"
                    />
                </div>
            </div>

            {/* Main Cards Grid */}
            <div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-8 italic">
                    Municipal Offices / Units & Sections
                </h2>

                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filtered.map((charter, idx) => {
                            const Icon = getOfficeIcon(charter.officeName);
                            return (
                                <motion.div
                                    key={charter.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                                    className="group flex flex-col justify-between p-6 bg-white dark:bg-[#0a0c12] border border-slate-200/60 dark:border-white/5 rounded-[2rem] hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                                >
                                    <div className="space-y-5">
                                        {/* Office Icon Container */}
                                        <div 
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-300 bg-slate-50 dark:bg-white/5 group-hover:text-white"
                                            style={{ '--hover-bg': 'var(--primary-theme)' } as React.CSSProperties}
                                        >
                                            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--primary-theme)' }} />
                                            <Icon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-white transition-colors relative z-10" />
                                        </div>

                                        {/* Office Details */}
                                        <div className="space-y-1">
                                            <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 leading-snug group-hover:text-primary transition-colors" style={{ '--hover-color': 'var(--primary-theme)' } as React.CSSProperties}>
                                                {charter.officeName}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">
                                                Citizen&apos;s Charter Guide
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                                        <Button 
                                            asChild
                                            className="w-full h-11 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-md transition-all group-hover:scale-[1.02] flex items-center justify-center gap-2"
                                            style={{ backgroundColor: 'var(--primary-theme)', boxShadow: '0 4px 12px color-mix(in srgb, var(--primary-theme) 20%, transparent)' }}
                                        >
                                            <a href={charter.fileUrl} target="_blank" rel="noopener noreferrer">
                                                View Document
                                                <ExternalLink className="w-3.5 h-3.5 mb-0.5" />
                                            </a>
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
                        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h4 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase italic tracking-tight">No Charters Found</h4>
                        <p className="text-slate-400 text-sm font-medium italic mt-1 max-w-xs mx-auto">
                            {search.trim() ? "No departments match your search term. Try another query." : "We are currently compiling the documents. Please check back soon!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
