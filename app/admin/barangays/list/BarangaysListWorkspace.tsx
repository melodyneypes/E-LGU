"use client";

import { useState } from "react";
import { Plus, MoreVertical, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddBarangayModal } from "./components/AddBarangayModal";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { deleteBarangay } from "../../actions";
import { toast } from "sonner";

// Define the type since Prisma auto-gen might be lagging for the client
 
export function BarangaysListWorkspace({ initialData, themeColor = "#2563eb" }: { initialData: any[]; themeColor?: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to completely remove this Barangay?")) return;
        setIsDeleting(true);
        try {
            const result = await deleteBarangay(id);
            if (result.success) {
                toast.success("Barangay deleted successfully!");
                window.location.reload();
            } else {
                toast.error(result.error || "Failed to delete");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredData = initialData.filter((item) =>
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
                    className="text-white font-bold uppercase tracking-wider text-xs px-6 py-6 rounded-2xl hover:opacity-90 transition-all"
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
                            <TableHead className="font-bold text-right w-[150px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-40 text-center text-slate-500">
                                    {searchQuery ? "No matching Barangays found." : "No Barangays found. Click \"Register New Barangay\" to add one."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-lg text-slate-900 dark:text-white uppercase leading-tight">
                                                {item.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                                                    <MoreVertical className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b]">
                                                <DropdownMenuItem 
                                                    className="font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
                                                    onClick={() => { setEditingItem(item); setIsAddModalOpen(true); }}
                                                >
                                                    <Edit size={14} className="mr-2" style={{ color: themeColor }} />
                                                    Edit Name
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 size={14} className="mr-2 text-red-600 dark:text-red-400" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {isAddModalOpen && (
                <AddBarangayModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    editingItem={editingItem}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
}
