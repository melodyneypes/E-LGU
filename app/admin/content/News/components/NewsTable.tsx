"use client";

import { useNews, News } from "../providers/NewsProvider";
import { deleteNews, toggleNewsStatus, getNewsById } from "@/app/admin/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Calendar, Newspaper, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function NewsTable() {
    const {
        newsData,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useNews();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [fetchingId, setFetchingId] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRange = Math.min(page * pageSize, totalCount);

    const updateUrlParam = (paramName: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, value);
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            updateUrlParam("page", newPage.toString());
        }
    };

    const handlePageSizeChange = (newSize: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("pageSize", newSize);
        params.set("page", "1");
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleEdit = async (item: News) => {
        setFetchingId(item.id);
        try {
            const res = (await getNewsById(item.id)) as { success: boolean; data?: News; news?: News; error?: string };
            if (res.success && (res.data || res.news)) {
                setEditingData((res.data || res.news) as News);
                setIsAddModalOpen(true);
            } else {
                toast.error(res.error || "Failed to load article details.");
            }
        } catch {
            toast.error("Error fetching article details.");
        } finally {
            setFetchingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return;
        setDeletingId(id);
        try {
            await deleteNews(id);
            toast.success("News deleted successfully!");
        } catch {
            toast.error("Failed to delete news.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            await toggleNewsStatus(id, !currentStatus);
            toast.success(`News ${!currentStatus ? "published" : "unpublished"} successfully!`);
        } catch {
            toast.error("Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    if (newsData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/5"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary-theme, #2563eb) 10%, transparent)" }}
                >
                    <Newspaper className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">No Articles Found</h3>
                <p className="text-slate-500 font-medium italic max-w-sm mt-2">
                    No articles match your current search criteria. Try adjusting your filters or publish a new one!
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto relative">
                {isPending && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#151b2b]/60 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-300">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 shadow-xl">
                            <span
                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: themeColor, borderTopColor: "transparent" }}
                            />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 italic">
                                Refreshing articles...
                            </span>
                        </div>
                    </div>
                )}
                <Table className={cn("transition-opacity duration-300", isPending && "opacity-40")}>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                            <TableHead className="w-[80px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Image
                            </TableHead>
                            <TableHead className="w-[300px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Article Details
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Category
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Author
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Date Posted
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-center">
                                Published
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {newsData.map((item) => (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,transparent)] transition-colors border-b border-slate-200 dark:border-[#2a3040]"
                            >
                                <TableCell className="pl-8">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        {item.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Newspaper className="w-5 h-5 text-slate-300" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-5">
                                    <div className="flex flex-col space-y-1.5">
                                        <span className="text-slate-900 dark:text-white font-black uppercase italic tracking-tight leading-tight transition-colors">
                                            {item.title}
                                        </span>
                                        {item.content && (
                                            <span className="text-[11px] text-slate-500 font-medium italic line-clamp-1 max-w-[300px]">
                                                {item.content}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {item.category}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                        <User className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        {item.author || "Admin"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                        <Calendar className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        {format(new Date(item.publishDate), "MMM d, yyyy")}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={item.isPublished}
                                        onCheckedChange={() => handleToggleStatus(item.id, item.isPublished)}
                                        disabled={togglingId === item.id}
                                    />
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <div className="flex justify-end gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(item)}
                                                        disabled={fetchingId === item.id}
                                                        className="h-9 w-9 rounded-xl border border-transparent transition-all hover:bg-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--primary-theme)_20%,transparent)] text-blue-600"
                                                    >
                                                        {fetchingId === item.id ? (
                                                            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Edit2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit News</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={deletingId === item.id}
                                                        className="h-9 w-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 border border-transparent hover:border-red-200 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete News</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Server-Driven Pagination Control Bar */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> articles
                    </span>

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Rows per page:</span>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                    </Button>

                    <span className="text-xs font-black px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
                        {page} / {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => handlePageChange(page + 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </>
    );
}
