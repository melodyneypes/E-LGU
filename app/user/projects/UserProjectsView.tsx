"use client";

import { motion } from "framer-motion";
import { FolderKanban, Home, Clock, MapPin, Gauge, Search, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function UserProjectsView({ initialProjects = [] }: { initialProjects: any[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");

    const filteredProjects = useMemo(() => {
        return initialProjects.filter(project => {
            const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 project.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = selectedStatus === "All" || project.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });
    }, [initialProjects, searchQuery, selectedStatus]);

    const pageTitle = "Municipal Initiatives";

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
                            <FolderKanban className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{pageTitle}</h1>
                            <p className="text-[8px] md:text-[10px] font-bold text-primary uppercase tracking-[0.3em] ml-1">LGU Infrastructure</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-2 md:gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-[300px] group">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="pl-9 md:pl-11 h-10 md:h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl font-bold italic text-xs md:text-sm focus:ring-primary/20"
                        />
                    </div>

                    <div className="w-[130px] md:w-[200px] shrink-0">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="h-10 md:h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl font-bold italic text-[10px] md:text-sm focus:ring-primary/20 shadow-sm">
                                <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-primary" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-2xl">
                                <SelectItem value="All" className="font-bold italic text-[10px] md:text-sm uppercase tracking-widest">All Status</SelectItem>
                                <SelectItem value="Planned" className="font-bold italic text-[10px] md:text-sm uppercase tracking-widest">Planned</SelectItem>
                                <SelectItem value="Ongoing" className="font-bold italic text-[10px] md:text-sm uppercase tracking-widest">Ongoing</SelectItem>
                                <SelectItem value="Completed" className="font-bold italic text-[10px] md:text-sm uppercase tracking-widest">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium italic max-w-2xl leading-relaxed px-2 md:px-0">
                Monitor the infrastructure and social development projects shaping the future of our municipality. Transparency and progress in every brick laid.
            </p>

            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-2 md:px-0">
                {filteredProjects.map((project, idx) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group h-full"
                    >
                        <Link href={`/user/projects/${project.id}`} className="block h-full">
                            <div className="h-full bg-white dark:bg-[#0a0c10] rounded-2xl md:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col group-hover:border-primary transition-all overflow-hidden">
                                <div className="relative aspect-[4/3] md:h-64 w-full overflow-hidden">
                                    <Image
                                        src={project.imageUrl || "/projects/default.png"}
                                        alt={project.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    
                                    <div className="absolute top-2 left-2 md:top-6 md:left-6">
                                        <span className={cn(
                                            "px-2 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest backdrop-blur-sm border shadow-lg",
                                            project.status === "Completed" 
                                                ? "bg-emerald-500/90 text-white border-emerald-400/30"
                                                : "bg-primary/90 text-white border-white/20"
                                        )}>
                                            {project.status || "Planned"}
                                        </span>
                                    </div>

                                    <div className="absolute bottom-2 left-2 right-2 md:bottom-6 md:left-6 md:right-6 flex items-center justify-between">
                                        <div className="flex items-center gap-1 md:gap-2 text-white/90">
                                            <MapPin className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-primary" />
                                            <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] md:max-w-[150px]">
                                                {project.location}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 md:gap-2 bg-white/10 backdrop-blur-md px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/20">
                                            <Gauge className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                                            <span className="text-[7px] md:text-[10px] font-black text-white">{project.progress}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 md:p-8 flex-1 flex flex-col space-y-3 md:space-y-6">
                                    <div className="space-y-2 md:space-y-4 flex-1">
                                        <div className="flex items-center gap-1.5 text-[7px] md:text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 w-fit">
                                            <Clock className="w-2.5 h-2.5" />
                                            {project.updatedAt ? `Updated ${format(new Date(project.updatedAt), "MMM d")}` : "Updated Today"}
                                        </div>
                                        
                                        <h3 className="text-sm md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight italic line-clamp-2">
                                            {project.title}
                                        </h3>

                                        <p className="line-clamp-2 md:line-clamp-3 text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="pt-3 md:pt-6 border-t border-slate-100 dark:border-white/5 mt-auto">
                                        <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 md:h-2 rounded-full overflow-hidden shadow-inner">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${project.progress}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--primary-theme)] opacity-80"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="mx-4 md:mx-0 py-24 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] md:rounded-[4rem] bg-white dark:bg-black/10">
                    <FolderKanban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] italic text-xs md:text-base">No initiatives found...</p>
                </div>
            )}
        </div>
    );
}

