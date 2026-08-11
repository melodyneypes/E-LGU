"use client";

import React from "react";
import { useOtherFees, OtherFeeItem } from "./OtherFeesProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Edit, Trash2, Eye, Store, Link as LinkIcon } from "lucide-react";
import { deleteOtherFee } from "../actions";

export function OtherFeesTable() {
    const {
        otherFees,
        search,
        setSelectedFee,
        setIsEditOpen,
        setEditingFee,
        setIsAssignOpen,
        setAssigningFee,
    } = useOtherFees();

    const filtered = otherFees.filter(
        (item) =>
            item.code.toLowerCase().includes(search.toLowerCase()) ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    );

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete fee "${name}"?`)) {
            const res = await deleteOtherFee(id);
            if (!res.success) {
                alert(res.error || "Failed to delete fee");
            }
        }
    };

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <DollarSign className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Fees Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try searching with a different fee code or name.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Code
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Fee Name
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Default Amount
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Description
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Assigned Stalls
                            </TableHead>
                            <TableHead className="w-[160px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((item: OtherFeeItem) => (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                            >
                                <TableCell className="pl-8 py-4">
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
                                        {item.code}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-black text-slate-900 dark:text-white text-xs uppercase italic">
                                        {item.name}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-black text-slate-900 dark:text-white text-xs">
                                        ₱{item.amount.toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-slate-500 font-medium italic line-clamp-1">
                                        {item.description || "N/A"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">
                                        <Store size={10} /> {item._count?.stalls || 0} stalls
                                    </span>
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedFee(item)}
                                            className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                                            title="View Details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setAssigningFee(item);
                                                setIsAssignOpen(true);
                                            }}
                                            className="h-8 w-8 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                            title="Assign Stalls"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingFee(item);
                                                setIsEditOpen(true);
                                            }}
                                            className="h-8 w-8 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                                            title="Edit Fee"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item.id, item.name)}
                                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                            title="Delete Fee"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
