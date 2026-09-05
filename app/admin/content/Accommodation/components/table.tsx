"use client";

import { useAccommodation, Accommodation } from "../providers/AccommodationProvider";
import { deleteAccommodation, toggleAccommodationStatus, getAccommodationById } from "../actions/accommodation.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, BedDouble, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Skeleton } from "@/components/ui/skeleton";

export function AccommodationTable() {
    const {
        accommodationData,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useAccommodation();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [accommodationToDelete, setAccommodationToDelete] = useState<Accommodation | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    // 8. FAST EDIT MODAL OPENING: Instant modal opening with cached row data + background sync
    const handleEdit = (item: Accommodation) => {
        setEditingData(item);
        setIsAddModalOpen(true);

        getAccommodationById(item.id).then((res) => {
            if (res.success && (res.data || res.accommodation)) {
                setEditingData((res.data || res.accommodation) as Accommodation);
            }
        }).catch((err) => {
            console.warn("[handleEdit background sync error]:", err);
        });
    };

    // 7. CONFIRM DELETE MODAL HANDLER
    const handleConfirmDelete = async () => {
        if (!accommodationToDelete) return;
        setIsDeleting(true);
        setIsPending(true);
        try {
            const res = await deleteAccommodation(accommodationToDelete.id);
            if (!res.success) throw new Error(res.error);
            toast.success("Accommodation entry deleted successfully!");
            setAccommodationToDelete(null);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete accommodation entry.");
            setIsPending(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setIsPending(true);
        try {
            const res = await toggleAccommodationStatus(id, currentStatus);
            if (!res.success) throw new Error(res.error);
            toast.success(`Accommodation ${!currentStatus ? "published" : "hidden"} successfully!`);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status.");
            setIsPending(false);
        }
    };

    if (accommodationData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <BedDouble className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Accommodations Found</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                    No accommodation listings match your current filters. Clear search or add a new entry.
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
                            <TableHead className="w-[320px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Tuluyan / Property
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Type
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Location & Address
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-center">
                                Active
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="border-b border-slate-200 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-40 rounded" />
                                                <Skeleton className="h-3 w-20 rounded" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-6 w-24 rounded-lg" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-36 rounded" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-6 w-10 rounded-full mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : accommodationData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic">
                                    No accommodations found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            accommodationData.map((item) => (
                                <TableRow
                                    key={item.id}
                                    onClick={() => router.push(`/admin/accommodation/${item.id}`)}
                                    className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-200 dark:border-[#2a3040] cursor-pointer"
                                >
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                                {item.imageUrl ? (
                                                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <BedDouble className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight line-clamp-1 max-w-[260px] group-hover:text-primary transition-colors">
                                                    {item.name}
                                                </span>
                                                {item.barangay && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                        {item.barangay}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            {item.type || "General"}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center text-slate-600 dark:text-slate-300 text-xs font-bold gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span className="line-clamp-1 max-w-[240px]">{item.address}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            checked={item.isPublished}
                                            onCheckedChange={() => handleToggleStatus(item.id, item.isPublished)}
                                        />
                                    </TableCell>

                                    <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(item)}
                                                            className="h-9 w-9 rounded-xl transition-all border border-transparent cursor-pointer"
                                                            style={{ color: themeColor }}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Accommodation</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {/* Hide delete action temporarily */}
                                            {/* <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setAccommodationToDelete(item)}
                                                            className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Accommodation</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider> */}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 7. CONFIRM DELETE MODAL */}
            <ConfirmDeleteModal
                isOpen={!!accommodationToDelete}
                onClose={() => setAccommodationToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Accommodation"
                description={`Are you sure you want to delete "${accommodationToDelete?.name}"? Any uploaded photo in storage will also be deleted.`}
                isLoading={isDeleting}
            />

            {/* Pagination Control Bar */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> listings
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
