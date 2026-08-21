"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    FileText,
    Plus,
    Search,
    Trash2,
    Download,
    Eye,
    Building2,
    AlertCircle,
    CheckCircle2,
    X,
    Loader2,
    Paperclip,
    Send,
} from "lucide-react";
import { createExecutiveDirective, deleteExecutiveDirective } from "../actions";
import { toast } from "sonner";

interface DirectiveItem {
    id: string;
    title: string;
    content: string;
    category: string;
    priority: string;
    targetScope: string;
    targetBarangay: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentSize: string | null;
    senderName: string | null;
    isPublished: boolean;
    createdAt: string;
    reads?: {
        userId: string;
        readAt: string;
        user?: {
            name: string | null;
            managedBarangay: string | null;
        } | null;
    }[];
}

interface DirectivesClientProps {
    initialData: DirectiveItem[];
    totalCount: number;
    barangays: string[];
    page: number;
    pageSize: number;
    search: string;
    category: string;
    priority: string;
    targetScope: string;
    targetBarangay: string;
}

export function DirectivesClient({
    initialData,
    barangays,
    search: initSearch,
    category: initCategory,
    priority: initPriority,
    targetScope: initScope,
}: DirectivesClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [directives, setDirectives] = useState<DirectiveItem[]>(initialData);
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDirective, setSelectedDirective] = useState<DirectiveItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Sync directives whenever initialData updates from server
    useEffect(() => {
        setDirectives(initialData);
    }, [initialData]);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("MEMORANDUM");
    const [priority, setPriority] = useState("NORMAL");
    const [targetScope, setTargetScope] = useState("ALL_CAPTAINS");
    const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
    const [senderName, setSenderName] = useState("Office of the Municipal Mayor");
    const [file, setFile] = useState<File | null>(null);

    // Local filters
    const [search, setSearch] = useState(initSearch);

    const toggleBarangay = (brgy: string) => {
        setSelectedBarangays((prev) =>
            prev.includes(brgy) ? prev.filter((b) => b !== brgy) : [...prev, brgy]
        );
    };

    const handleSelectAllBarangays = () => {
        if (selectedBarangays.length === barangays.length) {
            setSelectedBarangays([]);
        } else {
            setSelectedBarangays([...barangays]);
        }
    };

    const updateFilters = (newParams: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        Object.entries(newParams).forEach(([key, val]) => {
            if (val === "" || val === "ALL") {
                params.delete(key);
            } else {
                params.set(key, String(val));
            }
        });
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search, page: 1 });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error("Please fill in title and message content.");
            return;
        }

        if (targetScope === "SPECIFIC_BARANGAY" && selectedBarangays.length === 0) {
            toast.error("Please select at least one Barangay checkbox.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("category", category);
        formData.append("priority", priority);
        formData.append("targetScope", targetScope);
        if (targetScope === "SPECIFIC_BARANGAY") {
            formData.append("targetBarangays", JSON.stringify(selectedBarangays));
        }
        formData.append("senderName", senderName);
        if (file) {
            formData.append("attachment", file);
        }

        const res = await createExecutiveDirective(formData);
        setIsSubmitting(false);

        if (res.success) {
            toast.success("Executive Directive & Memorandum dispatched to Barangay Captains!");
            setIsModalOpen(false);
            resetForm();
            if (res.data) {
                setDirectives((prev) => [
                    {
                        ...res.data,
                        createdAt: res.data.createdAt ? new Date(res.data.createdAt).toISOString() : new Date().toISOString(),
                        reads: []
                    },
                    ...prev
                ]);
            }
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error(res.error || "Failed to dispatch directive.");
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteId(id);
        const res = await deleteExecutiveDirective(id);
        setDeleteId(null);

        if (res.success) {
            toast.success("Executive directive deleted.");
            setDirectives((prev) => prev.filter((d) => d.id !== id));
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error(res.error || "Failed to delete directive.");
        }
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setCategory("MEMORANDUM");
        setPriority("NORMAL");
        setTargetScope("ALL_CAPTAINS");
        setSelectedBarangays([]);
        setSenderName("Office of the Municipal Mayor");
        setFile(null);
    };

    const getPriorityBadge = (p: string) => {
        if (p === "CRITICAL") {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Critical
                </span>
            );
        }
        if (p === "URGENT") {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Urgent
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Normal
            </span>
        );
    };

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                                Executive Directives & Memoranda
                            </h1>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-0.5">
                                Official Municipal-to-Barangay Captains Issuance & Directive Desk
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Issue New Directive / Memo
                </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search directive title, message, or sender..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={initCategory}
                            onChange={(e) => updateFilters({ category: e.target.value, page: 1 })}
                            className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="MEMORANDUM">Memorandum</option>
                            <option value="ADVISORY">Executive Advisory</option>
                            <option value="DIRECTIVE">Mayoral Directive</option>
                            <option value="EXECUTIVE_ORDER">Executive Order</option>
                        </select>

                        <select
                            value={initPriority}
                            onChange={(e) => updateFilters({ priority: e.target.value, page: 1 })}
                            className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Priorities</option>
                            <option value="NORMAL">Normal</option>
                            <option value="URGENT">Urgent</option>
                            <option value="CRITICAL">Critical</option>
                        </select>

                        <select
                            value={initScope}
                            onChange={(e) => updateFilters({ targetScope: e.target.value, page: 1 })}
                            className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Recipients</option>
                            <option value="ALL_CAPTAINS">All 15 Captains</option>
                            <option value="SPECIFIC_BARANGAY">Specific Barangay</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Directives Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500">
                                <th className="py-4 px-6">Issuance Details</th>
                                <th className="py-4 px-6">Category / Priority</th>
                                <th className="py-4 px-6">Target Recipients</th>
                                <th className="py-4 px-6">PDF Attachment</th>
                                <th className="py-4 px-6 text-center">Captains Read</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium">
                            {isPending ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6">
                                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                                            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto" />
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto" />
                                        </td>
                                    </tr>
                                ))
                            ) : directives.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                        No executive directives or memoranda found.
                                    </td>
                                </tr>
                            ) : (
                                directives.map((d) => {
                                    const dateStr = new Date(d.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric"
                                    });

                                    const readsCount = d.reads?.length || 0;

                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-4 px-6 max-w-xs">
                                                <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                                                    {d.title}
                                                </p>
                                                <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                                                    {d.senderName || "Office of the Mayor"} · {dateStr}
                                                </p>
                                            </td>

                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                                                        {d.category.replace("_", " ")}
                                                    </span>
                                                    {getPriorityBadge(d.priority)}
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                {d.targetScope === "ALL_CAPTAINS" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                        <Building2 className="w-3.5 h-3.5" /> All 15 Barangays
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                        <Building2 className="w-3.5 h-3.5" /> Brgy. {d.targetBarangay}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6">
                                                {d.attachmentUrl ? (
                                                    <a
                                                        href={d.attachmentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        <span className="max-w-[140px] truncate">{d.attachmentName || "View PDF"}</span>
                                                        <span className="text-[10px] text-slate-400">({d.attachmentSize})</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No attachment</span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 text-center">
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-700 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    {readsCount} {d.targetScope === "ALL_CAPTAINS" ? "/ 15" : ""}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedDirective(d)}
                                                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                                        title="View Directive Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(d.id)}
                                                        disabled={deleteId === d.id}
                                                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-40"
                                                        title="Delete Directive"
                                                    >
                                                        {deleteId === d.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                                        Issue Directive / Memorandum
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Dispatch official text memo & PDF attachment to Barangay Captains
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Title / Subject *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Urgent: Flood Risk Advisory & Drainage Clearance"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                        Issuance Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    >
                                        <option value="MEMORANDUM">Memorandum (Circular)</option>
                                        <option value="ADVISORY">Executive Advisory</option>
                                        <option value="DIRECTIVE">Mayoral Directive</option>
                                        <option value="EXECUTIVE_ORDER">Executive Order</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                        Priority Level
                                    </label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    >
                                        <option value="NORMAL">Normal Priority</option>
                                        <option value="URGENT">Urgent (High Notice)</option>
                                        <option value="CRITICAL">Critical (Immediate Action)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                                    Target Recipients *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                            targetScope === "ALL_CAPTAINS"
                                                ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                                                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="targetScope"
                                            value="ALL_CAPTAINS"
                                            checked={targetScope === "ALL_CAPTAINS"}
                                            onChange={() => setTargetScope("ALL_CAPTAINS")}
                                            className="hidden"
                                        />
                                        <Building2 className="w-4 h-4" />
                                        <span className="text-xs">All 15 Barangay Captains</span>
                                    </label>

                                    <label
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                            targetScope === "SPECIFIC_BARANGAY"
                                                ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                                                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="targetScope"
                                            value="SPECIFIC_BARANGAY"
                                            checked={targetScope === "SPECIFIC_BARANGAY"}
                                            onChange={() => setTargetScope("SPECIFIC_BARANGAY")}
                                            className="hidden"
                                        />
                                        <Building2 className="w-4 h-4" />
                                        <span className="text-xs">Specific Barangay Only</span>
                                    </label>
                                </div>
                            </div>

                            {targetScope === "SPECIFIC_BARANGAY" && (
                                <div className="space-y-3 p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 shadow-inner">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                Target Barangays
                                            </label>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-sm">
                                                {selectedBarangays.length} / {barangays.length} Selected
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllBarangays}
                                                className="px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer shadow-sm active:scale-95"
                                            >
                                                {selectedBarangays.length === barangays.length ? "Deselect All" : "Select All 15"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Scrollable Card Container */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-indigo-500/30 dark:scrollbar-thumb-indigo-400/20 scrollbar-track-transparent hover:scrollbar-thumb-indigo-500/50">
                                        {barangays.map((b) => {
                                            const isChecked = selectedBarangays.includes(b);
                                            return (
                                                <div
                                                    key={b}
                                                    onClick={() => toggleBarangay(b)}
                                                    className={`group flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold select-none cursor-pointer transition-all duration-200 ${
                                                        isChecked
                                                            ? "bg-gradient-to-r from-indigo-50 to-indigo-100/60 dark:from-indigo-500/15 dark:to-indigo-500/5 border-indigo-500/80 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/30 scale-[1.01]"
                                                            : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                                    }`}
                                                >
                                                    <span className="truncate pr-1">{b}</span>
                                                    <div
                                                        className={`w-4 h-4 rounded-lg flex items-center justify-center transition-all ${
                                                            isChecked
                                                                ? "bg-indigo-600 text-white shadow-sm"
                                                                : "border border-slate-300 dark:border-slate-700 group-hover:border-slate-400"
                                                        }`}
                                                    >
                                                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Official Message / Instruction Content *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write the full directive message or text advisory for the Barangay Captains..."
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Attach Official PDF Memorandum (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-500/10 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                    Supported: Signed PDF circulars, official memorandum files (Max 15MB)
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" /> Dispatch Directive
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {selectedDirective && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase">
                                        {selectedDirective.category}
                                    </span>
                                    {getPriorityBadge(selectedDirective.priority)}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    {selectedDirective.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Issued by: {selectedDirective.senderName} · {new Date(selectedDirective.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDirective(null)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-bold uppercase text-slate-400 mb-2">Message Body</p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {selectedDirective.content}
                                </p>
                            </div>

                            {selectedDirective.attachmentUrl && (
                                <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                            <Paperclip className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                {selectedDirective.attachmentName || "Official PDF Memo"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                PDF Document · {selectedDirective.attachmentSize}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={selectedDirective.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" /> View PDF
                                    </a>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-bold uppercase text-slate-400 mb-2">
                                    Captains Read Receipts ({selectedDirective.reads?.length || 0})
                                </p>
                                {selectedDirective.reads && selectedDirective.reads.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDirective.reads.map((r, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-500/20"
                                            >
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                {r.user?.name || "Captain"} (Brgy. {r.user?.managedBarangay || "N/A"})
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No captains have marked this as read yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
