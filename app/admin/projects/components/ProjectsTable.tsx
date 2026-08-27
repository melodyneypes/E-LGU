"use client";

import { useProjects, Project } from "../providers/ProjectsProvider";
import { deleteProject, toggleProjectStatus, getProjectById } from "../actions/projects.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, FolderKanban, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

export function ProjectsTable() {
    const {
        projectsData,
        setProjectsData,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useProjects();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

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

    // 8. FAST EDIT MODAL OPENING: Instant modal popup using cached row data with background sync
    const handleEdit = (item: Project) => {
        setEditingData(item);
        setIsAddModalOpen(true);

        // Background sync for latest field data
        getProjectById(item.id).then((res) => {
            if (res.success && (res.data || res.project)) {
                setEditingData((res.data || res.project) as Project);
            }
        }).catch((err) => {
            console.warn("[handleEdit background sync error]:", err);
        });
    };

    // 7. CONFIRM DELETE MODAL HANDLER
    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);

        // Optimistic UI state update
        const previousData = [...projectsData];
        setProjectsData(projectsData.filter((p) => p.id !== projectToDelete.id));

        try {
            const res = await deleteProject(projectToDelete.id);
            if (!res.success) {
                setProjectsData(previousData);
                toast.error(res.error || "Failed to delete project.");
                return;
            }
            toast.success("Project deleted successfully!");
            setProjectToDelete(null);
            router.refresh();
        } catch {
            setProjectsData(previousData);
            toast.error("Failed to delete project.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        const previousData = [...projectsData];
        setProjectsData(
            projectsData.map((p) => (p.id === id ? { ...p, isPublished: !currentStatus } : p))
        );

        try {
            const res = await toggleProjectStatus(id, !currentStatus);
            if (!res.success) {
                setProjectsData(previousData);
                toast.error(res.error || "Failed to update status.");
                return;
            }
            toast.success(`Project ${!currentStatus ? "published" : "hidden"} successfully!`);
            router.refresh();
        } catch {
            setProjectsData(previousData);
            toast.error("Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            Planned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
            Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
            Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            Suspended: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${colors[status] || colors.Planned}`}>
                {status}
            </span>
        );
    };

    return (
        <>
            <div className="relative">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pl-8">
                                Project & Category
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Location & Scope
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Status & Progress
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
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={`skeleton-${idx}`} className="border-b border-slate-200 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="w-12 h-12 rounded-xl" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-2 w-28" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-8 mx-auto rounded-full" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : projectsData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <FolderKanban className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Projects Found</p>
                                            <p className="text-xs text-slate-500">Create a new municipal project or adjust your filters.</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            projectsData.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className={`group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040] ${
                                        projectToDelete?.id === item.id && isDeleting ? "opacity-40 pointer-events-none" : ""
                                    }`}
                                >
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                                {item.imageUrl ? (
                                                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <FolderKanban className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight line-clamp-1 max-w-[260px]">
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                    {item.category}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-slate-600 dark:text-slate-300 text-xs font-bold gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span className="line-clamp-1 max-w-[200px]">{item.location}</span>
                                        </div>
                                        {item.barangay && (
                                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                {item.barangay}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col space-y-1.5 min-w-[120px]">
                                            <StatusBadge status={item.status} />
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500">{item.progress}%</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={item.isPublished}
                                            disabled={togglingId === item.id}
                                            onCheckedChange={() => handleToggleStatus(item.id, item.isPublished)}
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
                                                            className="h-9 w-9 rounded-xl transition-all border border-transparent hover:bg-slate-100 dark:hover:bg-[#1a1f2e]"
                                                            style={{ color: themeColor }}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Project</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setProjectToDelete(item)}
                                                            className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Project</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> projects
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

            <ConfirmDeleteModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Project"
                description={`Are you sure you want to permanently delete "${projectToDelete?.title}"? This will also remove all associated files from storage.`}
                isLoading={isDeleting}
            />
        </>
    );
}
