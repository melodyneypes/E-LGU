"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Briefcase, Timer, Home, MapPin, Calendar, Search, Filter } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Job } from "../../admin/jobs/providers/JobsProvider";

interface UserJobsViewProps {
    initialJobs: Job[];
    activeBarangays?: string[];
}

export function UserJobsView({ 
    initialJobs = [], 
    activeBarangays = [] 
}: UserJobsViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBarangay, setSelectedBarangay] = useState("All");

    const barangayList = useMemo(() => {
        return ["All", ...activeBarangays.sort()];
    }, [activeBarangays]);

    const filteredJobs = useMemo(() => {
        return initialJobs.filter(job => {
            const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 job.department.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesBarangay = selectedBarangay === "All" || job.barangay === selectedBarangay;
            return matchesSearch && matchesBarangay;
        });
    }, [initialJobs, searchQuery, selectedBarangay]);

    const pageTitle = "Career Hub";

    return (
        <div className="space-y-6 md:space-y-12 pb-20">
            {/* Breadcrumb section */}
            <div className="md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic max-w-[200px] truncate">{pageTitle}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            
            {/* Header section with Search/Filter - STICKY on Mobile */}
            <div className="sticky md:static top-[64px] sm:top-[80px] md:top-auto z-40 bg-white/95 dark:bg-[#0a0c10]/95 md:bg-transparent md:dark:bg-transparent px-4 md:px-0 pt-4 pb-3 md:py-0 -mx-4 md:mx-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-8 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-primary rounded-xl md:rounded-[22px] flex items-center justify-center shadow-lg md:shadow-2xl shadow-primary/40 transform -rotate-3 hover:rotate-0 transition-transform shrink-0">
                            <Briefcase className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{pageTitle}</h1>
                            <p className="text-[8px] md:text-[10px] font-bold text-primary uppercase tracking-[0.3em] ml-1">LGU Recruitment</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-2 md:gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-[300px] group">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search roles..."
                            className="pl-9 md:pl-11 h-10 md:h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl font-bold italic text-xs md:text-sm focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div className="w-[130px] md:w-[200px] shrink-0">
                        <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                            <SelectTrigger className="h-10 md:h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl font-bold italic text-[10px] md:text-sm focus:ring-primary/20 shadow-sm">
                                <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-primary" />
                                <SelectValue placeholder="Barangay" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-2xl">
                                {barangayList.map(b => (
                                    <SelectItem key={b} value={b} className="font-bold italic text-[10px] md:text-sm uppercase tracking-widest">
                                        {b === "All" ? "All Locations" : b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium italic max-w-2xl leading-relaxed px-2 md:px-0">
                Empowering our community through employment. Find your next opportunity within the municipal government and local industries across all sectors.
            </p>

            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-2 md:px-0">
                {filteredJobs.map((job, idx) => (
                    <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group h-full"
                    >
                        <Link href={`/user/jobs/${job.id}`} className="block h-full">
                            <div className="h-full p-4 md:p-8 bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col group-hover:border-primary transition-all active:scale-[0.98]">
                                <div className="space-y-3 md:space-y-6 flex-1 flex flex-col">
                                    <div className="space-y-2 md:space-y-4">
                                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/10 text-emerald-600 rounded-lg md:rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">{job.employmentType}</span>
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-primary/10 text-primary rounded-lg md:rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest border border-primary/20">{job.department}</span>
                                        </div>
                                        
                                        <h3 className="text-sm md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight italic line-clamp-2">
                                            {job.title}
                                        </h3>

                                        <div className="flex flex-col gap-1 md:gap-2">
                                            {(job.location) && (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                                    <span className="text-[7px] md:text-[10px] font-bold uppercase tracking-widest truncate">{job.location}</span>
                                                </div>
                                            )}
                                            {job.barangay && (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Home className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                                    <span className="text-[7px] md:text-[10px] font-bold uppercase tracking-widest truncate">Brgy. {job.barangay}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium italic line-clamp-2 leading-relaxed flex-1">
                                        {job.description}
                                    </p>
                                    
                                    <div className="flex flex-col gap-2 pt-3 md:pt-6 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-1.5 md:gap-2 text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                            <Timer className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
                                            Posted {format(new Date(job.createdAt), "MMM d, yyyy")}
                                        </div>
                                        {job.deadline && (
                                            <div className="flex items-center gap-1.5 md:gap-2 text-[7px] md:text-[10px] font-black text-red-500 uppercase tracking-widest italic">
                                                <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                                Deadline: {format(new Date(job.deadline), "MMM d")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {filteredJobs.length === 0 && (
                <div className="mx-4 md:mx-0 py-24 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] md:rounded-[4rem] bg-white dark:bg-black/10">
                    <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] italic text-xs md:text-base">No active opportunities found...</p>
                </div>
            )}
        </div>
    );
}

