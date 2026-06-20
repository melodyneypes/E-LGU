"use client";

import { useOfficials } from "../providers/OfficialsProvider";
import { deleteOfficial, toggleOfficialStatus } from "@/app/admin/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

export function OfficialsTable() {
    const { 
        officialsData, setOfficialsData, searchTerm, setEditingData, 
        setIsAddModalOpen, selectedPosition, selectedCategory,
        selectedStatus, selectedBarangay, themeColor
    } = useOfficials();
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const filteredData = (officialsData as any[]).filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.position.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPosition = selectedPosition === "All" || item.position === selectedPosition;
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesStatus = selectedStatus === "All" || 
            (selectedStatus === "Active" && item.isActive) ||
            (selectedStatus === "Inactive" && !item.isActive);
        
        // Barangay Filtering Logic
        let matchesBarangay = false;
        if (selectedBarangay === "LGU") {
            matchesBarangay = item.category === "LGU" || !item.barangay;
        } else {
            matchesBarangay = item.barangay === selectedBarangay;
        }

        return matchesSearch && matchesPosition && matchesCategory && matchesStatus && matchesBarangay;
    }).sort((a, b) => a.order - b.order);

     
    const handleEdit = (item: any) => {
        setEditingData(item);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this official's profile?")) return;
        setDeletingId(id);
        try {
            await deleteOfficial(id);
            setOfficialsData(officialsData.filter(item => item.id !== id));
            router.refresh();
            toast.success("Official profile deleted successfully!");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Failed to delete profile.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            await toggleOfficialStatus(id, !currentStatus);
            setOfficialsData(officialsData.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item));
            router.refresh();
            toast.success(`Official profile ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    if (filteredData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Officials Found</h3>
                <p className="text-slate-500 max-w-sm">
                    No council members match your search criteria. Try adjusting your filters or add a new official.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-[#1e2330] hover:bg-slate-50 dark:hover:bg-[#1e2330] border-y border-slate-200 dark:border-[#2a3040]">
                        <TableHead className="w-[80px] font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Photo</TableHead>
                        <TableHead className="w-[300px] font-bold text-slate-900 dark:text-slate-100 h-12 text-xs uppercase tracking-widest">Name & Contact</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Position</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center text-xs uppercase tracking-widest">Hierarchy</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center text-xs uppercase tracking-widest">Active</TableHead>
                        <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-[#202635] transition-colors border-b border-slate-200 dark:border-[#2a3040]">
                            <TableCell>
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-slate-900 dark:text-white font-bold leading-tight">{item.name}</span>
                                    <span className="text-xs text-slate-500 line-clamp-1">{item.contactNumber || "No contact info"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                        <ShieldCheck className="w-4 h-4 mr-1.5" style={{ color: themeColor }} />
                                        {item.position}
                                    </div>
                                    <span className={cn(
                                        "w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border",
                                        item.category === "LGU" ? "bg-primary/10 text-primary border-primary/20" : 
                                        item.category === "SK Council" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    )}>
                                        {item.category === "LGU" ? "Municipal" : item.category === "SK Council" ? "SK Member" : "Brgy Council"}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Order: {item.order}
                                </span>
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
                                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-blue-900/50"
                                                    style={{ color: themeColor }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Edit Profile</TooltipContent>
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
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete Profile</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}