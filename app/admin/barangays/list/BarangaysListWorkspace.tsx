"use client";

import { useState } from "react";
import { Plus, Edit, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddBarangayModal } from "./components/AddBarangayModal";
import { deleteBarangay, getBarangays } from "./actions";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

export function BarangaysListWorkspace({ initialData, themeColor = "#2563eb" }: { initialData: any[]; themeColor?: string }) {
    const [dataList, setDataList] = useState(initialData);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [deletingItem, setDeletingItem] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const refreshBarangays = async () => {
        setIsRefreshing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 350));
            const res = await getBarangays();
            if (res.success && res.data) {
                setDataList(res.data);
            }
        } catch {
            console.error("Failed to refresh barangays list.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setIsDeleting(true);
        const previousList = [...dataList];

        // Optimistic removal
        setDataList(prev => prev.filter(item => item.id !== deletingItem.id));

        try {
            const result = await deleteBarangay(deletingItem.id);
            if (result.success) {
                toast.success(`Barangay "${deletingItem.name}" deleted successfully!`);
                setDeletingItem(null);
            } else {
                // Rollback on server rejection
                setDataList(previousList);
                toast.error(result.error || "Failed to delete barangay.");
            }
        } catch {
            // Rollback on unexpected error
            setDataList(previousList);
            toast.error("An unexpected error occurred during deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredData = dataList.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900 dark:text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Manage Barangays</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Add and update the official list of Barangays setup in the municipality.</p>
                </div>
                <Button
                    onClick={() => { setEditingItem(null); setIsAddModalOpen(true); }}
                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                    className="text-white font-bold uppercase tracking-wider text-xs px-6 py-6 rounded-2xl hover:opacity-90 transition-all cursor-pointer"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Register New Barangay
                </Button>
            </div>

            <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                    type="text"
                    placeholder="Search Barangay name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-6 rounded-2xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500 font-medium placeholder:text-slate-400/80 shadow-sm transition-all"
                />
            </div>

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold py-5">Barangay Name</TableHead>
                            <TableHead className="font-bold text-right w-[150px] pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isRefreshing ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                                            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-40 text-center text-slate-500">
                                    {searchQuery ? "No matching Barangays found." : "No Barangays found. Click \"Register New Barangay\" to add one."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-lg text-slate-900 dark:text-white uppercase leading-tight">
                                                {item.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setEditingItem(item); setIsAddModalOpen(true); }}
                                                className="h-8 px-3 rounded-xl border-slate-200 dark:border-[#2a3040] hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                                title="Edit Barangay"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                <span>Edit</span>
                                            </Button>
                                            {/* Hide delete action temporarily */}
                                            {/* <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeletingItem(item)}
                                                className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-[#2a3040] hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all font-bold text-xs flex items-center justify-center cursor-pointer"
                                                title="Delete Barangay"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button> */}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Custom Modern Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title="Delete Barangay"
                description={
                    deletingItem ? (
                        <span>
                            Are you sure you want to delete Barangay{" "}
                            <strong className="text-slate-900 dark:text-white font-black">
                                &quot;{deletingItem.name}&quot;
                            </strong>
                            ? This action will remove the official barangay registration entry.
                        </span>
                    ) : undefined
                }
                confirmText="Delete Barangay"
            />

            {isAddModalOpen && (
                <AddBarangayModal
                    isOpen={isAddModalOpen}
                    onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }}
                    onSuccess={refreshBarangays}
                    editingItem={editingItem}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
}
