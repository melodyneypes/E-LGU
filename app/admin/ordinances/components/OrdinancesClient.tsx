"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
    Scale, 
    Search, 
    Plus, 
    Edit2, 
    Trash2, 
    FileDown, 
    FileText, 
    Calendar,
    ChevronLeft, 
    ChevronRight,
    Eye,
    X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { deleteLegislativeDocument, getLegislativeDocumentById } from "../actions";
import { AddOrdinanceModal } from "./AddOrdinanceModal";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
    createdAt: Date;
    updatedAt: Date;
}

interface OrdinancesClientProps {
    initialData: LegislativeDocument[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    type: string;
    status: string;
}

export function OrdinancesClient({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    type,
    status
}: OrdinancesClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<LegislativeDocument | null>(null);
    const [viewingData, setViewingData] = useState<LegislativeDocument | null>(null);
    const [docToDelete, setDocToDelete] = useState<LegislativeDocument | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters local states
    const [searchLocal, setSearchLocal] = useState(search);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRange = Math.min(page * pageSize, totalCount);

    const updateUrlParams = (updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === "ALL" && key !== "type" && key !== "status") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (!updates.page) {
            params.set("page", "1"); // Reset to page 1 on filter change
        }
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateUrlParams({ search: searchLocal });
    };

    // 7. CONFIRM DELETE MODAL HANDLER
    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        setIsDeleting(true);
        try {
            const res = await deleteLegislativeDocument(docToDelete.id);
            if (res.success) {
                toast.success("Document deleted successfully!");
                setDocToDelete(null);
                updateUrlParams({ page: page.toString() }); // Refresh page
            } else {
                toast.error(res.error || "Failed to delete document.");
            }
        } catch {
            toast.error("An error occurred while deleting the document.");
        } finally {
            setIsDeleting(false);
        }
    };

    // 8. FAST EDIT MODAL OPENING: Instant modal opening with cached row data + background sync
    const handleEdit = (doc: LegislativeDocument) => {
        setEditingData(doc);
        setIsAddModalOpen(true);

        getLegislativeDocumentById(doc.id).then((res) => {
            if (res.success && (res.data || res.document)) {
                setEditingData((res.data || res.document) as LegislativeDocument);
            }
        }).catch((err) => {
            console.warn("[handleEdit background sync error]:", err);
        });
    };

    const handleAddNew = () => {
        setEditingData(null);
        setIsAddModalOpen(true);
    };

    // New pagination handler to update URL params and navigate
    const handlePageChange = (newPage: number) => {
        // Ensure page stays within bounds
        const safePage = Math.max(1, Math.min(newPage, totalPages));
        updateUrlParams({ page: safePage.toString() });
    };

    const sortedData = React.useMemo(() => {
        return [...initialData].sort((a, b) => {
            const dateA = new Date(a.dateApproved).getTime();
            const dateB = new Date(b.dateApproved).getTime();
            if (dateB !== dateA) return dateB - dateA;
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdB - createdA;
        });
    }, [initialData]);

    // Aggregate some simple metrics
    const totalOrdinances = initialData.filter(d => d.type === "ORDINANCE").length;
    const totalResolutions = initialData.filter(d => d.type === "RESOLUTION").length;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Scale className="mr-3 w-10 h-10" style={{ color: "var(--primary-theme, #2563eb)" }} />
                        Ordinances & Resolutions
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Manage municipal ordinances, resolution updates, and official policy uploads.
                    </p>
                </div>
                <Button
                    onClick={handleAddNew}
                    className="text-white rounded-2xl h-12 px-6 font-black uppercase tracking-wider text-xs shadow-lg flex items-center gap-2 self-start md:self-auto active:scale-95 transition-all"
                    style={{
                        backgroundColor: "var(--primary-theme, #2563eb)",
                        boxShadow: "0 10px 25px -5px var(--primary-theme, #2563eb)40"
                    }}
                >
                    <Plus className="w-4 h-4" /> Add Legislative Doc
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Scale className="w-7 h-7" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Items in View</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Ordinances (Page)</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalOrdinances}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <FileDown className="w-7 h-7" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Resolutions (Page)</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalResolutions}</h3>
                    </div>
                </div>
            </div>

            {/* List & Filters Container */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-sm">
                
                {/* Filters */}
                <div className="p-6 border-b border-slate-200 dark:border-[#2a3040] flex flex-col md:flex-row items-center gap-4 justify-between bg-slate-50/50 dark:bg-[#111420]">
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                value={searchLocal}
                                onChange={(e) => setSearchLocal(e.target.value)}
                                placeholder="Search by title, ref no, description..."
                                className="h-11 pl-11 bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold italic"
                            />
                        </div>
                        <Button type="submit" size="sm" className="bg-slate-900 dark:bg-[#1a1f2e] text-white hover:bg-slate-800 dark:hover:bg-[#23293a] h-11 px-4 rounded-xl text-xs font-black uppercase tracking-wider">
                            Search
                        </Button>
                    </form>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Type Filter */}
                        <Select value={type} onValueChange={(val) => updateUrlParams({ type: val })}>
                            <SelectTrigger className="w-[150px] h-11 bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="Doc Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-250 dark:border-[#2a3040]">
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="ORDINANCE">Ordinance</SelectItem>
                                <SelectItem value="RESOLUTION">Resolution</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={status} onValueChange={(val) => updateUrlParams({ status: val })}>
                            <SelectTrigger className="w-[180px] h-11 bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-250 dark:border-[#2a3040]">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE / ENFORCED">Active / Enforced</SelectItem>
                                <SelectItem value="ADOPTED / IMPLEMENTATION PENDING">Implementation Pending</SelectItem>
                                <SelectItem value="ADOPTED / CEREMONIAL">Adopted / Ceremonial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto relative">
                    <Table className="border-collapse">
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-[#111420] border-y border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                    Type & Reference
                                </TableHead>
                                <TableHead className="w-[380px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Title & Brief Description
                                </TableHead>
                                <TableHead className="w-[160px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Approved Date
                                </TableHead>
                                <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Status
                                </TableHead>
                                <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-center">
                                    File
                                </TableHead>
                                <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <TableRow key={`skeleton-${idx}`} className="border-b border-slate-200 dark:border-[#2a3040]">
                                        <TableCell className="pl-8 py-5">
                                            <div className="space-y-2">
                                                <Skeleton className="h-5 w-20 rounded-full" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-64" />
                                                <Skeleton className="h-3 w-40" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-24 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Skeleton className="h-8 w-8 mx-auto rounded-xl" />
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-1">
                                                <Skeleton className="h-8 w-8 rounded-xl" />
                                                <Skeleton className="h-8 w-8 rounded-xl" />
                                                <Skeleton className="h-8 w-8 rounded-xl" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1a1f2e] flex items-center justify-center mb-4 border border-slate-200 dark:border-[#2a3040]">
                                                <Scale className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">No Documents Found</h3>
                                            <p className="text-slate-500 font-medium italic max-w-sm mt-1 text-xs">
                                                Try adjusting your keywords or filters, or add a new municipal document.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={cn(
                                            "border-b border-slate-200 dark:border-[#2a3040]/50 hover:bg-slate-50/20 dark:hover:bg-[#1a1f2e]/10 transition-colors",
                                            docToDelete?.id === item.id && isDeleting && "opacity-40 pointer-events-none"
                                        )}
                                    >
                                        {/* Type & Ref */}
                                        <TableCell className="font-bold py-4 pl-8">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-sm",
                                                    item.type === "ORDINANCE"
                                                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"
                                                        : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30"
                                                )}>
                                                    {item.type}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.referenceNumber}</span>
                                            </div>
                                        </TableCell>

                                        {/* Title & Brief */}
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1 max-w-[360px] whitespace-normal break-words">
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight line-clamp-1">{item.title}</span>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic line-clamp-1 leading-relaxed">{item.description}</p>
                                                {item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {item.tags.map(tag => (
                                                            <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Approved Date */}
                                        <TableCell className="py-4 font-bold text-slate-600 dark:text-slate-400 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{format(new Date(item.dateApproved), "MMMM d, yyyy")}</span>
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none shadow-sm",
                                                item.status.includes("ACTIVE") || item.status.includes("ENFORCED")
                                                    ? "bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                                    : item.status.includes("PENDING")
                                                        ? "bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                                                        : "bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                                            )}>
                                                {item.status}
                                            </span>
                                        </TableCell>

                                        {/* File URL */}
                                        <TableCell className="py-4 text-center">
                                            {item.pdfUrl ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setViewingData(item)}
                                                    className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400 transition-colors shadow-sm"
                                                    title="View Document"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-bold italic">None</span>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="py-4 text-right pr-8">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setViewingData(item)}
                                                    className="w-8 h-8 rounded-xl text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                    className="w-8 h-8 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all"
                                                    title="Edit Document"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDocToDelete(item)}
                                                    className="w-8 h-8 rounded-xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all"
                                                    title="Delete Document"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] flex items-center justify-between bg-slate-50/50 dark:bg-[#111420]">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Showing <span className="text-slate-800 dark:text-slate-200">{startRange}</span> to{" "}
                            <span className="text-slate-800 dark:text-slate-200">{endRange}</span> of{" "}
                            <span className="text-slate-800 dark:text-slate-200">{totalCount}</span> entries
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Page size select */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rows:</span>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={(val) => updateUrlParams({ pageSize: val, page: "1" })}
                                >
                                    <SelectTrigger className="w-[70px] h-9 bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-250 dark:border-[#2a3040]">
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Prev / Next buttons */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page <= 1 || isPending}
                                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-[#2a3040] text-xs font-bold gap-1 active:scale-95 transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                </Button>
                                
                                <span className="text-xs font-black px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                                    {page} / {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= totalPages || isPending}
                                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-[#2a3040] text-xs font-bold gap-1 active:scale-95 transition-all"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddOrdinanceModal
                isOpen={isAddModalOpen}
                setIsOpen={setIsAddModalOpen}
                editingData={editingData}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    updateUrlParams({ page: page.toString() });
                }}
            />

            {/* 7. CONFIRM DELETE MODAL */}
            <ConfirmDeleteModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Delete ${docToDelete?.type === "RESOLUTION" ? "Resolution" : "Ordinance"}`}
                description={`Are you sure you want to permanently delete "${docToDelete?.referenceNumber} - ${docToDelete?.title}"? This will also remove any attached PDF files from storage.`}
                isLoading={isDeleting}
            />

            {/* View Document Details Modal */}
            <Dialog open={!!viewingData} onOpenChange={(open) => !open && setViewingData(null)}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-[#0f111a] border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between bg-slate-50/50 dark:bg-[#1a1f2e]/20">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                                style={{ backgroundColor: "var(--primary-theme, #2563eb)", color: "white" }}
                            >
                                <Scale className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    {viewingData?.type} Details
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400">
                                    {viewingData?.referenceNumber}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingData(null)}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogHeader>

                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Document Title</span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-snug tracking-tight">
                                {viewingData?.title}
                            </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-[#151926] border border-slate-100 dark:border-[#2a3040]/50">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Date Approved</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{viewingData?.dateApproved && format(new Date(viewingData.dateApproved), "MMMM d, yyyy")}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</span>
                                <div>
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none shadow-sm",
                                        viewingData?.status.includes("ACTIVE") || viewingData?.status.includes("ENFORCED")
                                            ? "bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                            : viewingData?.status.includes("PENDING")
                                                ? "bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                                                : "bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                                    )}>
                                        {viewingData?.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Brief & Enforced Rules</span>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {viewingData?.description}
                            </p>
                        </div>

                        {viewingData?.tags && viewingData.tags.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Category Tags</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {viewingData.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {viewingData?.pdfUrl && (
                            <div className="pt-3">
                                <a
                                    href={viewingData.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm border"
                                    style={{
                                        backgroundColor: "var(--primary-theme, #2563eb)15",
                                        borderColor: "var(--primary-theme, #2563eb)30",
                                        color: "var(--primary-theme, #2563eb)"
                                    }}
                                >
                                    <FileText className="w-4 h-4" /> View Full Attachment PDF
                                </a>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
