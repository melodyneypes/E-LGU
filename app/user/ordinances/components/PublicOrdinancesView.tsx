"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Scale, Search, FileText, Eye, Home } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { SearchableFilterDropdown } from "@/components/shared/SearchableFilterDropdown";

interface LegislativeDocument {
    id: string;
    title: string;
    description: string;
    type: "ORDINANCE" | "RESOLUTION";
    referenceNumber: string;
    dateApproved: string;
    status: string;
    pdfUrl: string | null;
    tags: string[];
    createdAt: string;
}

export function PublicOrdinancesView({ initialDocuments = [] }: { initialDocuments: LegislativeDocument[] }) {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "ORDINANCE" | "RESOLUTION">("ALL");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // View Details Modal State
    const [selectedDoc, setSelectedDoc] = useState<LegislativeDocument | null>(null);

    // Extract available category tags from documents with "All" guaranteed at index 0
    const availableCategories = useMemo(() => {
        const tags = initialDocuments.flatMap(doc => doc.tags || []);
        const unique = Array.from(new Set(tags.filter(Boolean))).sort((a, b) => a.localeCompare(b));
        return ["All", ...unique];
    }, [initialDocuments]);

    // Extract available statuses with "All" guaranteed at index 0
    const availableStatuses = useMemo(() => {
        const statuses = initialDocuments.map(doc => doc.status).filter(Boolean);
        const unique = Array.from(new Set(statuses)).sort((a, b) => a.localeCompare(b));
        return ["All", ...unique];
    }, [initialDocuments]);

    // Filtering logic
    const filteredDocs = useMemo(() => {
        return initialDocuments.filter(doc => {
            if (activeTab !== "ALL" && doc.type !== activeTab) return false;
            if (statusFilter !== "All" && doc.status !== statusFilter) return false;
            if (categoryFilter !== "All" && !doc.tags.includes(categoryFilter)) return false;

            if (search.trim()) {
                const query = search.toLowerCase();
                return (
                    doc.title.toLowerCase().includes(query) ||
                    doc.description.toLowerCase().includes(query) ||
                    doc.referenceNumber.toLowerCase().includes(query) ||
                    doc.tags.some(tag => tag.toLowerCase().includes(query))
                );
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.dateApproved).getTime();
            const dateB = new Date(b.dateApproved).getTime();
            if (dateB !== dateA) return dateB - dateA;
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdB - createdA;
        });
    }, [initialDocuments, search, activeTab, statusFilter, categoryFilter]);

    // Pagination calculations
    const totalItems = filteredDocs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedDocs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDocs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDocs, currentPage]);

    const pageTitle = "Ordinances & Resolutions";

    return (
        <div className="space-y-6 md:space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            {/* Breadcrumb section */}
            <div>
                <Breadcrumb>
                    <BreadcrumbList className="bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 w-fit shadow-sm">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">
                                    <Home className="w-3.5 h-3.5 mb-0.5" />
                                    Home
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-700" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--primary-theme, #2563eb)" }}>{pageTitle}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Header Title Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform shrink-0 text-white"
                        style={{ backgroundColor: "var(--primary-theme, #2563eb)" }}
                    >
                        <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{pageTitle}</h1>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--primary-theme, #2563eb)" }}>LGU Legislative Library</p>
                    </div>
                </div>

                {/* Right controls - Search & Tabs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[280px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search documents..."
                            className="h-10 pl-10 pr-4 bg-slate-950 border-slate-800 rounded-xl text-xs font-bold italic text-white placeholder-slate-500 focus-visible:ring-blue-500/50"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto">
                        {(["ALL", "ORDINANCE", "RESOLUTION"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    "flex-1 sm:flex-initial px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                    activeTab === tab
                                        ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                                        : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {tab === "ALL" ? "All" : tab === "ORDINANCE" ? "Ordinances" : "Resolutions"}
                            </button>
                        ))}
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
                    onChange={(val) => {
                        setStatusFilter(val);
                        setCurrentPage(1);
                    }}
                    placeholder="Search status..."
                />

                {/* Category Filter with Search */}
                <SearchableFilterDropdown
                    label="Category"
                    value={categoryFilter}
                    options={availableCategories}
                    onChange={(val) => {
                        setCategoryFilter(val);
                        setCurrentPage(1);
                    }}
                    placeholder="Search category..."
                />
            </div>

            {/* Documents List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[300px]">
                {paginatedDocs.length === 0 ? (
                    <div className="col-span-full bg-slate-950/40 rounded-2xl border border-slate-800/80 p-16 text-center">
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
                            className="bg-[#111625]/60 hover:bg-[#151b2d]/80 border border-slate-800/80 rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 group"
                        >
                            {/* Left type avatar */}
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-inner",
                                doc.type === "ORDINANCE"
                                    ? "bg-purple-950/40 border-purple-500/20 text-purple-400"
                                    : "bg-teal-950/40 border-teal-500/20 text-teal-400"
                            )}>
                                <span className="text-xs font-black tracking-tight">{doc.type === "ORDINANCE" ? "OR" : "RE"}</span>
                                <span className="text-[8px] font-black uppercase text-slate-500 mt-0.5 leading-none">NO.</span>
                            </div>

                            {/* Middle details */}
                            <div className="flex-1 space-y-2.5">
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

                                    <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-tight leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                        {doc.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic line-clamp-2">
                                        {doc.description}
                                    </p>
                                </div>

                                {/* Bottom info and actions */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/40">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Date Approved</span>
                                        <span className="text-[10px] font-bold text-slate-300 mt-1">{format(new Date(doc.dateApproved), "MMM dd, yyyy")}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedDoc(doc)}
                                            className="h-8 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Document
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-6">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Detailed View Modal */}
            <Dialog open={selectedDoc !== null} onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}>
                <DialogContent className="max-w-2xl bg-[#0b101f] border border-slate-800 rounded-3xl p-6 text-white outline-none shadow-2xl">
                    <DialogHeader className="space-y-2.5">
                        <DialogTitle className="sr-only">Document View Details</DialogTitle>
                        <DialogDescription className="sr-only">Details of the selected municipal ordinance or resolution</DialogDescription>
                        {selectedDoc && (
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                                <span className={cn(
                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none",
                                    selectedDoc.type === "ORDINANCE"
                                        ? "bg-purple-950/40 border-purple-500/20 text-purple-400"
                                        : "bg-teal-950/40 border-teal-500/20 text-teal-400"
                                )}>
                                    {selectedDoc.type}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{selectedDoc.referenceNumber}</span>
                            </div>
                        )}
                    </DialogHeader>

                    {selectedDoc && (
                        <div className="space-y-5 pt-3">
                            <div className="space-y-1.5">
                                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight leading-snug text-white italic">
                                    {selectedDoc.title}
                                </h2>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {selectedDoc.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-3 max-h-[300px] overflow-y-auto">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Brief Overview</span>
                                <p className="text-xs text-slate-300 leading-relaxed font-semibold whitespace-pre-line">
                                    {selectedDoc.description}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
                                <div className="flex gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Date Approved</span>
                                        <span className="text-[10.5px] font-bold text-slate-300 mt-0.5">{format(new Date(selectedDoc.dateApproved), "MMMM dd, yyyy")}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status / Enforcement</span>
                                        <span className="text-[10.5px] font-bold text-emerald-400 mt-0.5">{selectedDoc.status}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedDoc(null)}
                                        className="h-9 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Close
                                    </button>
                                    {selectedDoc.pdfUrl && (
                                        <a
                                            href={selectedDoc.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-9 px-4 rounded-xl text-white flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                            style={{ backgroundColor: "var(--primary-theme, #2563eb)" }}
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            View Document
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
