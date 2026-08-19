"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
    Scale, 
    Search, 
    Calendar, 
    Eye, 
    FileText, 
    ChevronDown, 
    X,
    ChevronLeft,
    ChevronRight,
    FileDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
}

function OrdinancesSectionContent({ documents }: OrdinancesSectionProps) {
    const searchParams = useSearchParams();
    const typeParam = searchParams?.get("type");

    // Filter states
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "ORDINANCE" | "RESOLUTION">("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [yearFilter, setYearFilter] = useState<string>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, activeTab, statusFilter, yearFilter, categoryFilter]);

    // Extract available years from documents
    const availableYears = useMemo(() => {
        const years = documents.map(doc => {
            try {
                return new Date(doc.dateApproved).getFullYear().toString();
            } catch {
                return "";
            }
        }).filter(Boolean);
        return ["All", ...Array.from(new Set(years))].sort((a, b) => b.localeCompare(a));
    }, [documents]);

    // Extract available category tags from documents
    const availableCategories = useMemo(() => {
        const tags = documents.flatMap(doc => doc.tags);
        return ["All", ...Array.from(new Set(tags))].sort();
    }, [documents]);

    // Extract available statuses
    const availableStatuses = useMemo(() => {
        const statuses = documents.map(doc => doc.status);
        return ["All", ...Array.from(new Set(statuses))].sort();
    }, [documents]);

    // Filtering logic
    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            // Tab filter
            if (activeTab !== "ALL" && doc.type !== activeTab) return false;

            // Status filter
            if (statusFilter !== "All" && doc.status !== statusFilter) return false;

            // Year filter
            if (yearFilter !== "All") {
                try {
                    const docYear = new Date(doc.dateApproved).getFullYear().toString();
                    if (docYear !== yearFilter) return false;
                } catch {
                    return false;
                }
            }

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
    }, [documents, search, activeTab, statusFilter, yearFilter, categoryFilter]);

    // Pagination calculations
    const totalItems = filteredDocs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedDocs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDocs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDocs, currentPage]);

    return (
        <section id="ordinances" className="py-20 md:py-28 px-6 bg-slate-900 dark:bg-[#070b16] relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto">
                {/* Main Container Card */}
                <div className="bg-[#0b101f] rounded-[2.5rem] border border-slate-800/80 shadow-2xl p-6 md:p-12 space-y-10 relative">
                    {/* Header Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-slate-800/80 pb-10">
                        {/* Title and Gavel Illustration */}
                        <div className="lg:col-span-7 flex flex-col md:flex-row items-center gap-8">
                            {/* Illustration Gavel */}
                            <div className="w-48 h-48 shrink-0 relative flex items-center justify-center bg-slate-900/60 rounded-3xl border border-slate-800/60 shadow-inner group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 opacity-30 group-hover:opacity-50 transition-opacity" />
                                <Scale className="w-20 h-20 text-slate-700 group-hover:text-blue-500 group-hover:scale-105 transition-all duration-300" />
                                <div className="absolute bottom-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800/80">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">LGU Mapandan</span>
                                </div>
                            </div>

                            {/* Title text */}
                            <div className="space-y-4 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                    <Scale className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">LGU MAPANDAN</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                                    Ordinance &<br className="hidden md:inline" /> Resolution Portal
                                </h2>
                                <p className="text-xs md:text-sm text-slate-400 font-medium italic max-w-md leading-relaxed">
                                    Transparent and instant access to approved local ordinances, resolutions, and legislative decisions.
                                </p>
                            </div>
                        </div>

                        {/* Search & Controls */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Search bar & Badge */}
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by title, number, keyword, or year..."
                                        className="h-11 pl-10 pr-4 bg-slate-950 border-slate-800/80 rounded-xl text-xs font-bold italic text-white placeholder-slate-500 focus-visible:ring-blue-500/50"
                                    />
                                </div>
                                <span className="h-11 px-4.5 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    RELEASING
                                </span>
                            </div>

                            {/* Tab Selectors */}
                            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
                                <button
                                    onClick={() => setActiveTab("ALL")}
                                    className={cn(
                                        "flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                        activeTab === "ALL"
                                            ? "bg-slate-900 text-white border border-slate-800/80 shadow-md"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    All Documents
                                </button>
                                <button
                                    onClick={() => setActiveTab("ORDINANCE")}
                                    className={cn(
                                        "flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                        activeTab === "ORDINANCE"
                                            ? "bg-slate-900 text-white border border-slate-800/80 shadow-md"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    Ordinances
                                </button>
                                <button
                                    onClick={() => setActiveTab("RESOLUTION")}
                                    className={cn(
                                        "flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                        activeTab === "RESOLUTION"
                                            ? "bg-slate-900 text-white border border-slate-800/80 shadow-md"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    Resolutions
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Dropdowns Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/40">
                        {/* Status Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Status</label>
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full h-10 px-4 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 appearance-none focus:outline-none focus:border-blue-500"
                                >
                                    {availableStatuses.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Year Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Year</label>
                            <div className="relative">
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="w-full h-10 px-4 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 appearance-none focus:outline-none focus:border-blue-500"
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Category Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Category</label>
                            <div className="relative">
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full h-10 px-4 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 appearance-none focus:outline-none focus:border-blue-500"
                                >
                                    {availableCategories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
                        {paginatedDocs.length === 0 ? (
                            <div className="col-span-full bg-slate-950/40 rounded-3xl border border-slate-800/80 p-16 text-center">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h4 className="text-sm font-black text-slate-300 uppercase tracking-tight">No documents matched filters</h4>
                                <p className="text-[11px] text-slate-500 font-bold italic mt-1.5">Try widening your search terms or selects.</p>
                            </div>
                        ) : (
                            paginatedDocs.map((doc) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={doc.id}
                                    className="bg-[#111625]/60 hover:bg-[#151b2d]/80 border border-slate-800/80 rounded-3xl p-6 flex items-start gap-5 transition-all duration-300 group"
                                >
                                    {/* Left type avatar */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border shadow-inner",
                                        doc.type === "ORDINANCE"
                                            ? "bg-purple-950/40 border-purple-500/20 text-purple-400"
                                            : "bg-teal-950/40 border-teal-500/20 text-teal-400"
                                    )}>
                                        <span className="text-xs font-black tracking-tight">{doc.type === "ORDINANCE" ? "OR" : "RE"}</span>
                                        <span className="text-[8px] font-black uppercase text-slate-500 mt-0.5 leading-none">NO.</span>
                                    </div>

                                    {/* Middle info */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                    {doc.referenceNumber}
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border leading-none shadow-sm",
                                                    doc.status.includes("ACTIVE") || doc.status.includes("ENFORCED")
                                                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/10"
                                                        : "bg-amber-950/30 text-amber-400 border-amber-500/10"
                                                )}>
                                                    {doc.status}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {doc.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic line-clamp-3">
                                                {doc.description}
                                            </p>
                                        </div>

                                        {/* Date and actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-800/40">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Date Approved</span>
                                                <span className="text-[10px] font-bold text-slate-300 mt-1">{format(new Date(doc.dateApproved), "MMM dd, yyyy")}</span>
                                            </div>

                                            {/* Action triggers */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedDoc(doc)}
                                                    className="h-8.5 px-3 rounded-lg text-slate-400 hover:text-white dark:hover:bg-slate-800 text-[9px] font-black uppercase tracking-wider border border-slate-800 hover:border-slate-700"
                                                >
                                                    <Eye className="w-3 h-3 mr-1.5" /> View Text
                                                </Button>

                                                {doc.pdfUrl && (
                                                    <a
                                                        href={doc.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center h-8.5 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[9px] font-black uppercase tracking-wider border border-blue-500/20 transition-colors"
                                                    >
                                                        <FileDown className="w-3 h-3 mr-1.5" /> Download PDF
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Pagination footer */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800/80">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                            </span>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8.5 h-8.5 rounded-lg border border-slate-800 text-slate-500 hover:text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-900"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>

                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const pageNum = i + 1;
                                    const isCurrent = pageNum === currentPage;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-8.5 h-8.5 rounded-lg text-[10px] font-black transition-all",
                                                isCurrent
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10 border border-blue-500"
                                                    : "border border-slate-800 text-slate-500 hover:text-white hover:bg-slate-900"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8.5 h-8.5 rounded-lg border border-slate-800 text-slate-500 hover:text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-900"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* View Details Modal for Landing Page */}
            <Dialog open={selectedDoc !== null} onOpenChange={(open) => {
                if (!open) setSelectedDoc(null);
            }}>
                <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-[#0c101d] border-slate-800 shadow-2xl rounded-[2rem] text-white">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/20 flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-sm",
                                selectedDoc?.type === "ORDINANCE"
                                    ? "bg-purple-950/40 text-purple-400 border border-purple-500/20"
                                    : "bg-teal-950/40 text-teal-400 border border-teal-500/20"
                            )}>
                                {selectedDoc?.type}
                            </span>
                            <DialogTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-white shrink-0 hover:bg-slate-900"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Document Title</span>
                            <h2 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
                                {selectedDoc?.title}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-800/80">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date Approved</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{selectedDoc ? format(new Date(selectedDoc.dateApproved), "MMMM dd, yyyy") : ""}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Current Status</span>
                                <div className="mt-0.5">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none shadow-sm",
                                        selectedDoc?.status.includes("ACTIVE") || selectedDoc?.status.includes("ENFORCED")
                                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                                            : "bg-amber-950/20 text-amber-400 border-amber-500/20"
                                    )}>
                                        {selectedDoc?.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Brief Description & Policy Content</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                {selectedDoc?.description}
                            </p>
                        </div>

                        {selectedDoc?.tags && selectedDoc.tags.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Category Tags</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedDoc.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-900 text-[9px] font-bold text-slate-400 tracking-wider">
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
                                    className="w-full flex items-center justify-center gap-2 h-11 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm border border-blue-500/20"
                                >
                                    <FileText className="w-4 h-4" /> View Full Attachment PDF
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-800/80 bg-slate-950/20 flex justify-end">
                        <Button
                            type="button"
                            onClick={() => setSelectedDoc(null)}
                            className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all border border-slate-800"
                        >
                            Close Details
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}

export function OrdinancesSection({ documents }: OrdinancesSectionProps) {
    return (
        <Suspense fallback={
            <div className="py-20 bg-slate-900 text-center text-slate-400">
                <Scale className="animate-spin w-10 h-10 mx-auto mb-4" />
                <p className="text-xs uppercase tracking-widest font-black">Loading Portal...</p>
            </div>
        }>
            <OrdinancesSectionContent documents={documents} />
        </Suspense>
    );
}
