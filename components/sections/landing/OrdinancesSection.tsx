"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
    Scale, 
    Search, 
    Calendar, 
    Eye, 
    FileText, 
    X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { SearchableFilterDropdown } from "@/components/shared/SearchableFilterDropdown";

interface LegislativeDocument {
    id: string;
    type: string;
    referenceNumber: string;
    title: string;
    description: string;
    tags: string[];
    dateApproved: Date | string;
    status: string;
    pdfUrl: string | null;
}

interface OrdinancesSectionProps {
    documents: LegislativeDocument[];
    themeColor?: string;
}

function OrdinancesSectionContent({ documents, themeColor }: OrdinancesSectionProps) {
    const searchParams = useSearchParams();
    const typeParam = searchParams?.get("type");
    const activeTheme = themeColor || "#0038a8";

    // Filter states
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "ORDINANCE" | "RESOLUTION">("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    
    // View Modal state
    const [selectedDoc, setSelectedDoc] = useState<LegislativeDocument | null>(null);

    // Sync tab with URL search parameter if present
    useEffect(() => {
        if (typeParam === "ORDINANCE") {
            setActiveTab("ORDINANCE");
        } else if (typeParam === "RESOLUTION") {
            setActiveTab("RESOLUTION");
        } else {
            setActiveTab("ALL");
        }
    }, [typeParam]);

    // Extract available category tags from documents with "All" guaranteed at index 0
    const availableCategories = useMemo(() => {
        const tags = documents.flatMap(doc => doc.tags || []);
        const unique = Array.from(new Set(tags.filter(Boolean))).sort((a, b) => a.localeCompare(b));
        return ["All", ...unique];
    }, [documents]);

    // Extract available statuses with "All" guaranteed at index 0
    const availableStatuses = useMemo(() => {
        const statuses = documents.map(doc => doc.status).filter(Boolean);
        const unique = Array.from(new Set(statuses)).sort((a, b) => a.localeCompare(b));
        return ["All", ...unique];
    }, [documents]);

    // Filtering logic
    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            // Tab filter
            if (activeTab !== "ALL" && doc.type !== activeTab) return false;

            // Status filter
            if (statusFilter !== "All" && doc.status !== statusFilter) return false;

            // Category filter
            if (categoryFilter !== "All" && !doc.tags.includes(categoryFilter)) return false;

            // Search filter
            const term = search.toLowerCase().trim();
            if (term) {
                const matchesSearch = 
                    doc.title.toLowerCase().includes(term) ||
                    doc.referenceNumber.toLowerCase().includes(term) ||
                    doc.description.toLowerCase().includes(term) ||
                    doc.tags.some(tag => tag.toLowerCase().includes(term));
                if (!matchesSearch) return false;
            }

            return true;
        });
    }, [documents, search, activeTab, statusFilter, categoryFilter]);

    // Pagination calculations
    // Limit to 2 ordinances and 2 resolutions on homepage when 'ALL' is selected
    const paginatedDocs = useMemo(() => {
        if (activeTab === "ALL") {
            const ordinances = filteredDocs.filter(d => d.type === "ORDINANCE").slice(0, 2);
            const resolutions = filteredDocs.filter(d => d.type === "RESOLUTION").slice(0, 2);
            return [...ordinances, ...resolutions].sort((a, b) => {
                return new Date(b.dateApproved).getTime() - new Date(a.dateApproved).getTime();
            });
        }
        return filteredDocs.slice(0, 2);
    }, [filteredDocs, activeTab]);

    const totalItems = filteredDocs.length;
    const showViewAll = totalItems > paginatedDocs.length;

    return (
        <section id="ordinances" className="py-10 md:py-12 px-4 sm:px-6 bg-slate-50 dark:bg-[#070b16] text-slate-900 dark:text-white relative">
            {/* Ambient background glows isolated in overflow-hidden container */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div 
                    className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-5"
                    style={{ backgroundColor: activeTheme }}
                />
                <div 
                    className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl opacity-5"
                    style={{ backgroundColor: activeTheme }}
                />
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Sticky Section Header on Mobile (Only Title and Badge stick, subtitle scrolls naturally) */}
                <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-3 pt-3 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:pt-0 bg-slate-50/95 dark:bg-[#070b16]/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-3 md:mb-0">
                    <div className="flex flex-col items-start gap-1.5 text-left">
                        <div 
                            className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border shadow-sm"
                            style={{
                                backgroundColor: `${activeTheme}15`,
                                borderColor: `${activeTheme}30`,
                                color: activeTheme
                            }}
                        >
                            <Scale className="w-3 h-3" style={{ color: activeTheme }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: activeTheme }}>
                                E-LGU LEGISLATIVE PORTAL
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                            Ordinance &<br className="hidden md:inline" /> Resolution Portal
                        </h2>
                    </div>
                </div>

                {/* Subtitle description on mobile (scrolls normally with content, doesn't eat screen space) */}
                <p className="block md:hidden text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mb-4 px-1 leading-relaxed">
                    Transparent and instant access to approved local ordinances, resolutions, and legislative decisions.
                </p>

                {/* Main Container: On mobile it is uncarded/clean, on desktop it retains the enclosed card design */}
                <div className="bg-transparent md:bg-white md:dark:bg-[#0b101f] rounded-none md:rounded-[2.5rem] border-0 md:border md:border-slate-200 md:dark:border-slate-800/80 shadow-none md:shadow-xl md:dark:shadow-2xl p-0 md:p-8 space-y-5 md:space-y-4 relative">
                    {/* Header Layout for Controls / Desktop Header info */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-center border-b border-slate-200/80 dark:border-slate-800/80 pb-5 md:pb-4">
                        {/* Hidden on mobile since mobile uses the sticky header above; visible on desktop for unified card grid layout */}
                        <div className="hidden md:flex lg:col-span-7 flex-col items-start gap-3">
                            <div className="space-y-2.5 text-left">
                                <div 
                                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border shadow-sm"
                                    style={{
                                        backgroundColor: `${activeTheme}15`,
                                        borderColor: `${activeTheme}30`,
                                        color: activeTheme
                                    }}
                                >
                                    <Scale className="w-3.5 h-3.5" style={{ color: activeTheme }} />
                                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: activeTheme }}>
                                        E-LGU LEGISLATIVE PORTAL
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                    Ordinance &<br className="hidden md:inline" /> Resolution Portal
                                </h2>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic max-w-md leading-relaxed">
                                    Transparent and instant access to approved local ordinances, resolutions, and legislative decisions.
                                </p>
                            </div>
                        </div>

                        {/* Search & Controls */}
                        <div className="lg:col-span-5 space-y-2.5 w-full">
                            {/* Search bar */}
                            <div className="relative w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by title, number, or keyword..."
                                    className="h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-bold italic text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-1 w-full"
                                />
                            </div>

                            {/* Tab Selectors */}
                            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                <button
                                    onClick={() => setActiveTab("ALL")}
                                    className={cn(
                                        "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                                        activeTab === "ALL"
                                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800/80 shadow-sm"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                    )}
                                >
                                    All Documents
                                </button>
                                <button
                                    onClick={() => setActiveTab("ORDINANCE")}
                                    className={cn(
                                        "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                                        activeTab === "ORDINANCE"
                                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800/80 shadow-sm"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                    )}
                                >
                                    Ordinances
                                </button>
                                <button
                                    onClick={() => setActiveTab("RESOLUTION")}
                                    className={cn(
                                        "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                                        activeTab === "RESOLUTION"
                                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800/80 shadow-sm"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                    )}
                                >
                                    Resolutions
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Compact Left-aligned Searchable Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3 w-full justify-start">
                        {/* Status Filter */}
                        <SearchableFilterDropdown
                            label="Status"
                            value={statusFilter}
                            options={availableStatuses}
                            onChange={(val) => setStatusFilter(val)}
                            themeColor={activeTheme}
                            placeholder="Search status..."
                        />

                        {/* Category Filter with Search */}
                        <SearchableFilterDropdown
                            label="Category"
                            value={categoryFilter}
                            options={availableCategories}
                            onChange={(val) => setCategoryFilter(val)}
                            themeColor={activeTheme}
                            placeholder="Search category..."
                        />
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[250px]">
                        {paginatedDocs.length === 0 ? (
                            <div className="col-span-full bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-16 text-center">
                                <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">No documents matched filters</h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold italic mt-1.5">Try widening your search terms or selects.</p>
                            </div>
                        ) : (
                            paginatedDocs.map((doc) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={doc.id}
                                    className="bg-white dark:bg-[#0b101f] md:bg-slate-50/80 md:dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md duration-300"
                                >
                                    <div className="space-y-3">
                                        {/* Top badge row */}
                                        <div className="flex items-center justify-between gap-3">
                                             <div className="flex items-center gap-2">
                                                 <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center">
                                                     <span className="text-[8px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none">
                                                         {doc.type === "ORDINANCE" ? "OR" : "RE"}
                                                     </span>
                                                     <span className="text-[6px] font-bold text-slate-500 dark:text-slate-600 uppercase leading-none">
                                                         NO.
                                                     </span>
                                                 </div>
                                                 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                                     {doc.referenceNumber}
                                                 </span>
                                             </div>

                                            {/* Status Badge */}
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border leading-none",
                                                doc.status.includes("ACTIVE") || doc.status.includes("ENFORCED")
                                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                                    : doc.status.includes("PENDING")
                                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                            )}>
                                                {doc.status}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                            {doc.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium italic line-clamp-2 leading-relaxed">
                                            {doc.description}
                                        </p>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Date Approved</span>
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">{format(new Date(doc.dateApproved), "MMM dd, yyyy")}</span>
                                        </div>

                                        {/* Action triggers */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedDoc(doc)}
                                                className="h-8.5 px-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                            >
                                                <Eye className="w-3 h-3 mr-1.5" /> View Text
                                            </Button>

                                            {doc.pdfUrl && (
                                                <a
                                                    href={doc.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center h-8.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all"
                                                    style={{
                                                        backgroundColor: `${activeTheme}15`,
                                                        borderColor: `${activeTheme}30`,
                                                        color: activeTheme
                                                    }}
                                                >
                                                    <FileText className="w-3 h-3 mr-1.5" /> View Document
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* View All Redirect Link */}
                    {showViewAll && (
                        <div className="flex justify-center pt-6 border-t border-slate-200 dark:border-slate-800/80">
                            <Link
                                href="/user/ordinances"
                                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                                style={{
                                    backgroundColor: activeTheme,
                                    boxShadow: `0 10px 25px -5px ${activeTheme}40`
                                }}
                            >
                                View All Ordinances & Resolutions ({totalItems}) ↗
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* View Details Modal for Landing Page */}
            <Dialog open={selectedDoc !== null} onOpenChange={(open) => {
                if (!open) setSelectedDoc(null);
            }}>
                <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-[#0c101d] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] text-slate-900 dark:text-white">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/20 flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-sm",
                                selectedDoc?.type === "ORDINANCE"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                            )}>
                                {selectedDoc?.type}
                            </span>
                            <DialogTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {selectedDoc?.referenceNumber}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View details for {selectedDoc?.referenceNumber}
                            </DialogDescription>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedDoc(null)}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0 hover:bg-slate-100 dark:hover:bg-slate-900"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Document Title</span>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
                                {selectedDoc?.title}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200 dark:border-slate-800/80">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Date Approved</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>{selectedDoc ? format(new Date(selectedDoc.dateApproved), "MMMM dd, yyyy") : ""}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Current Status</span>
                                <div className="mt-0.5">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none shadow-sm",
                                        selectedDoc?.status.includes("ACTIVE") || selectedDoc?.status.includes("ENFORCED")
                                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    )}>
                                        {selectedDoc?.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Brief Description & Policy Content</span>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {selectedDoc?.description}
                            </p>
                        </div>

                        {selectedDoc?.tags && selectedDoc.tags.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Category Tags</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedDoc.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[9px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedDoc?.pdfUrl && (
                            <div className="pt-3">
                                <a
                                    href={selectedDoc.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm border"
                                    style={{
                                        backgroundColor: `${activeTheme}15`,
                                        borderColor: `${activeTheme}30`,
                                        color: activeTheme
                                    }}
                                >
                                    <FileText className="w-4 h-4" /> View Full Attachment PDF
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/20 flex justify-end">
                        <Button
                            type="button"
                            onClick={() => setSelectedDoc(null)}
                            className="h-10 px-5 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all border border-slate-200 dark:border-slate-800"
                            style={{ backgroundColor: activeTheme }}
                        >
                            Close Details
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}

export function OrdinancesSection({ documents, themeColor }: OrdinancesSectionProps) {
    return (
        <Suspense fallback={
            <div className="py-20 bg-slate-900 text-center text-slate-400">
                <Scale className="animate-spin w-10 h-10 mx-auto mb-4" />
                <p className="text-xs uppercase tracking-widest font-black">Loading Portal...</p>
            </div>
        }>
            <OrdinancesSectionContent documents={documents} themeColor={themeColor} />
        </Suspense>
    );
}
