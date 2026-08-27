"use client";

import { useNews, News } from "../providers/NewsProvider";
import { deleteNews, toggleNewsStatus, getNewsById } from "../actions/news.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Calendar, Newspaper, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

export function NewsTable() {
    const {
        newsData,
        setNewsData,
        setEditingData,
        setIsAddModalOpen,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useNews();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [articleToDelete, setArticleToDelete] = useState<News | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
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

    const handleConfirmDelete = async () => {
        if (!articleToDelete) return;
        const targetId = articleToDelete.id;
        setIsDeleting(true);
        setIsPending(true);

        try {
            const res = await deleteNews(targetId);
            if (res.success) {
                setNewsData(newsData.filter((item) => item.id !== targetId));
                toast.success("News article deleted successfully!");
                setArticleToDelete(null);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete news article.");
                setIsPending(false);
            }
        } catch {
            toast.error("An unexpected error occurred while deleting.");
            setIsPending(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            await toggleNewsStatus(id, !currentStatus);
            setNewsData(
                newsData.map((item) =>
                    item.id === id ? { ...item, isPublished: !currentStatus } : item
                )
            );
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
                <Table>
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
                        {isPending ? (
                            Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                                <TableRow key={`news-skeleton-${idx}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                    <TableCell className="pl-8">
                                        <Skeleton className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-3 w-64 bg-slate-200/60 dark:bg-[#1a2133]/60" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-5 w-20 rounded-lg bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-9 mx-auto rounded-full bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-1">
                                            <Skeleton className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            newsData.map((item) => {
                            const isRowLoading = (articleToDelete?.id === item.id && isDeleting) || togglingId === item.id || fetchingId === item.id;
                            if (isRowLoading) {
                                return (
                                    <TableRow
                                        key={item.id}
                                        className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/40 dark:bg-slate-900/40"
                                    >
                                        <TableCell className="pl-8">
                                            <Skeleton className="w-12 h-12 rounded-xl" />
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="flex flex-col space-y-2">
                                                <Skeleton className="h-4 w-48 rounded-md" />
                                                <Skeleton className="h-3 w-64 rounded-md" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-6 w-20 rounded-lg" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24 rounded-md" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-28 rounded-md" />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <Skeleton className="h-5 w-9 rounded-full" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2">
                                                <Skeleton className="h-9 w-9 rounded-xl" />
                                                <Skeleton className="h-9 w-9 rounded-xl" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            return (
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
                                            {item.publishDate ? new Date(item.publishDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
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
                                                            <Edit2 className="w-4 h-4" />
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
                                                            onClick={() => setArticleToDelete(item)}
                                                            disabled={isDeleting}
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
                            );
                        })
                    )}
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

            {/* Modern Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={!!articleToDelete}
                onClose={() => {
                    if (!isDeleting) setArticleToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete News Article"
                description={`Are you sure you want to permanently delete "${articleToDelete?.title || "this article"}"? If it has an attached cover image, it will also be deleted from storage.`}
                isLoading={isDeleting}
            />
        </>
    );
}
