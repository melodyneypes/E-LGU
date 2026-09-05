"use client";

import { useJobs, Job } from "../providers/JobsProvider";
import { deleteJob, toggleJobStatus } from "../actions/jobs.actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, type CSSProperties } from "react";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Skeleton } from "@/components/ui/skeleton";

export function JobsTable() {
    const { jobsData, isLoading, searchTerm, setEditingData, setIsAddModalOpen, selectedDepartment, selectedStatus, themeColor } = useJobs();
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

    const filteredData = jobsData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedDepartment === "All" || item.department === selectedDepartment;
        const matchesStatus = selectedStatus === "All" || 
            (selectedStatus === "Active" && item.isActive) ||
            (selectedStatus === "Closed" && !item.isActive);
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const handleEdit = (item: Job) => {
        setEditingData(item);
        setIsAddModalOpen(true);
    };

    const handleDelete = (item: Job) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Job Vacancy",
            description: `Are you sure you want to permanently delete the job vacancy for "${item.title}" in the ${item.department} department?`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteJob(item.id);
                    if (!res.success) throw new Error(res.error);
                    toast.success("Job posting deleted successfully!");
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message || "Failed to delete job posting.");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await toggleJobStatus(id, !currentStatus);
            if (!res.success) throw new Error(res.error);
            toast.success(`Job marked as ${!currentStatus ? 'Active' : 'Closed'} successfully!`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    if (filteredData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Job Postings Found</h3>
                <p className="text-slate-500 max-w-sm">
                    No jobs match your search criteria. Try adjusting your filters or post a new job opening.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-[#1e2330] hover:bg-slate-50 dark:hover:bg-[#1e2330] border-y border-slate-200 dark:border-[#2a3040]">
                        <TableHead className="w-[280px] font-bold text-slate-900 dark:text-slate-100 h-12 text-xs uppercase tracking-widest">Job Role</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Department/Office</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Type</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Deadline</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center text-xs uppercase tracking-widest">Active</TableHead>
                        <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={`skeleton-${i}`} className="border-b border-slate-200 dark:border-[#2a3040]">
                                <TableCell className="py-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-40 rounded-md" />
                                        <Skeleton className="h-3 w-24 rounded-md" />
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 rounded-md" />
                                        <Skeleton className="h-3 w-20 rounded-md" />
                                    </div>
                                </TableCell>
                                <TableCell className="py-4"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                                <TableCell className="text-center py-4"><Skeleton className="h-6 w-10 mx-auto rounded-full" /></TableCell>
                                <TableCell className="text-right py-4"><Skeleton className="h-8 w-16 ml-auto rounded-xl" /></TableCell>
                            </TableRow>
                        ))
                    ) : filteredData.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-[#202635] transition-colors border-b border-slate-200 dark:border-[#2a3040]">
                            <TableCell className="font-medium">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-slate-900 dark:text-white font-bold leading-tight">{item.title}</span>
                                    <span className="text-xs text-slate-500 line-clamp-1">{item.salary || "Salary Unspecified"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col space-y-1">
                                    <div className="flex items-center text-slate-900 dark:text-white font-bold text-sm">
                                        <Building2 className="w-3.5 h-3.5 mr-1" style={{ color: themeColor }} />
                                        {item.department}
                                    </div>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black italic">{item.location || "Office Based"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                    {item.employmentType}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                                    {item.deadline ? format(new Date(item.deadline), "MMM d, yyyy") : "Until Filled"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Switch
                                    checked={item.isActive}
                                    onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                                    disabled={togglingId === item.id}
                                    className="data-[state=checked]:bg-primary"
                                    style={{ "--tw-bg-opacity": "1", backgroundColor: item.isActive ? themeColor : undefined } as CSSProperties}
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                    className="h-8 w-8 text-primary hover:text-primary/90 hover:bg-primary/10 dark:hover:bg-primary/20"
                                                    style={{ color: themeColor }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Edit Job</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item)}
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete Job</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModalConfig.isOpen}
                onClose={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={deleteModalConfig.onConfirm}
                title={deleteModalConfig.title}
                description={deleteModalConfig.description}
                isLoading={isDeleting}
            />
        </div>
    );
}
