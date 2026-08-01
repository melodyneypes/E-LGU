"use client";

import { useMayorNews, MayorNews } from "./MayorNewsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Newspaper, User, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function MayorNewsTable() {
    const {
        newsData,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useMayorNews();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    if (newsData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/5"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary-theme, #2563eb) 10%, transparent)" }}
                >
                    <Newspaper className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                    No Articles Found
                </h3>
                <p className="text-slate-500 font-medium italic max-w-sm mt-2">
                    No articles match your current search criteria. Try adjusting your filters.
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
                            <TableHead className="w-[300px] max-w-[300px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {newsData.map((item: MayorNews) => (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,transparent)] transition-colors border-b border-slate-200 dark:border-[#2a3040]"
                            >
                                {/* Image */}
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

                                {/* Article Details */}
                                <TableCell className="py-5 w-[280px]">
                                    <div className="flex flex-col space-y-1.5">
                                        {/* Title — JS truncate + tooltip */}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="text-slate-900 dark:text-white font-black uppercase italic tracking-tight leading-tight m-0 cursor-default">
                                                        {item.title.length > 60
                                                            ? item.title.slice(0, 60) + "..."
                                                            : item.title}
                                                    </p>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="top"
                                                    className="max-w-[420px] text-xs font-bold italic uppercase bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3 rounded-xl shadow-xl"
                                                >
                                                    {item.title}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {/* Content — JS truncate + tooltip */}
                                        {item.content && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <p className="text-[11px] text-slate-500 font-medium italic m-0 cursor-default">
                                                            {item.content.length > 70
                                                                ? item.content.slice(0, 70) + "..."
                                                                : item.content}
                                                        </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="bottom"
                                                        className="max-w-[420px] text-xs font-medium italic bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-800 p-3 rounded-xl shadow-xl"
                                                    >
                                                        {item.content}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </TableCell>



                                {/* Category */}
                                <TableCell>
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {item.category}
                                    </span>
                                </TableCell>

                                {/* Author */}
                                <TableCell>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                        <User className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        {item.author || "Admin"}
                                    </div>
                                </TableCell>

                                {/* Date Posted */}
                                <TableCell>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                        <Calendar className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        {item.publishDate
                                            ? new Date(item.publishDate).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                              })
                                            : "—"}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
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
