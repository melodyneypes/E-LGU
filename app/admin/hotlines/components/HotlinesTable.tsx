"use client";

import { useHotlines, Hotline } from "../providers/HotlinesProvider";
import { deleteHotline, toggleHotlineStatus } from "../actions/hotlines.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, Phone, PhoneCall, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Skeleton } from "@/components/ui/skeleton";

export function HotlinesTable() {
    const {
        hotlinesData,
        setHotlinesData,
        isLoading,
        refreshHotlines,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useHotlines();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: async () => {},
    });
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

    // Fast Instant Edit Opening
    const handleEdit = (item: Hotline) => {
        setEditingData(item);
        setIsAddModalOpen(true);
    };

    const handleDelete = (item: Hotline) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Emergency Hotline",
            description: `Are you sure you want to delete the hotline record for "${item.name}" (${item.category})? Emergency callers will no longer see this contact number.`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteHotline(item.id);
                    if (!res.success) throw new Error(res.error);
                    toast.success("Hotline entry deleted successfully!");
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                    await refreshHotlines();
                    router.refresh();
                } catch (error: any) {
                    toast.error(error.message || "Failed to delete hotline entry.");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await toggleHotlineStatus(id, !currentStatus);
            if (!res.success) throw new Error(res.error);
            setHotlinesData(hotlinesData.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item));
            toast.success(`Hotline ${!currentStatus ? "published" : "hidden"} successfully!`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    if (hotlinesData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Hotlines Found</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                    No emergency contact numbers match your current filters. Clear search or add a new hotline.
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
                                Agency / Service
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Contact Numbers
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
                        {(isLoading || isPending) ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="border-b border-slate-200 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="w-10 h-10 rounded-xl" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-40 rounded-md" />
                                                <Skeleton className="h-3 w-24 rounded-md" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="space-y-2">
                                            <Skeleton className="h-3 w-28 rounded-md" />
                                            <Skeleton className="h-3 w-24 rounded-md" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <Skeleton className="h-4 w-36 rounded-md" />
                                    </TableCell>
                                    <TableCell className="text-center py-5">
                                        <Skeleton className="h-6 w-10 mx-auto rounded-full" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-5">
                                        <Skeleton className="h-8 w-16 ml-auto rounded-xl" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            hotlinesData.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040]"
                                >
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 dark:border-blue-800">
                                                <PhoneCall className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight line-clamp-1 max-w-[260px]">
                                                    {item.name}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    {item.category}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col space-y-1 text-xs font-bold">
                                            {item.mobileNumber && (
                                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                                                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span>{item.mobileNumber}</span>
                                                </div>
                                            )}
                                            {item.telephone && (
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                                    <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                    <span>{item.telephone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center text-slate-600 dark:text-slate-300 text-xs font-bold gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span className="line-clamp-1 max-w-[240px]">{item.address || "Main Office, Mapandan"}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Switch
                                            checked={item.isActive}
                                            disabled={togglingId === item.id}
                                            onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                                            className="data-[state=checked]:bg-primary cursor-pointer"
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
                                                            className="h-9 w-9 rounded-xl transition-all border border-transparent cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            style={{ color: themeColor }}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Hotline</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {/* Hide delete action temporarily */}
                                            {/* <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item)}
                                                            className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Hotline</TooltipContent>
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

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModalConfig.isOpen}
                onClose={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={deleteModalConfig.onConfirm}
                title={deleteModalConfig.title}
                description={deleteModalConfig.description}
                isLoading={isDeleting}
            />

            {/* Pagination Control Bar */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> hotlines
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
