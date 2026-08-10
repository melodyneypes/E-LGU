"use client";

import React from "react";
import { useStalls, StallItem } from "./StallsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Store, User, Edit, Trash2, Eye, Tag } from "lucide-react";
import { deleteStall } from "../actions";

export function StallsTable() {
    const {
        stalls,
        search,
        selectedStatus,
        selectedStallType,
        setSelectedStall,
        setIsEditOpen,
        setEditingStall,
    } = useStalls();

    // Filter stalls logic
    const filteredStalls = stalls.filter((stall) => {
        const matchesSearch =
            stall.stallNumber.toLowerCase().includes(search.toLowerCase()) ||
            (stall.vendor?.name && stall.vendor.name.toLowerCase().includes(search.toLowerCase())) ||
            stall.stallType.name.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
            selectedStatus === "ALL" || stall.status === selectedStatus;

        const matchesType =
            selectedStallType === "ALL" || stall.stallTypeId === selectedStallType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OCCUPIED":
                return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Occupied</span>;
            case "VACANT":
                return <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">Vacant</span>;
            case "MAINTENANCE":
                return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Maintenance</span>;
            case "RESERVED":
                return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider">Reserved</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-black uppercase tracking-wider">{status}</span>;
        }
    };

    const handleDelete = async (id: string, stallNumber: string) => {
        if (confirm(`Are you sure you want to delete stall "${stallNumber}"?`)) {
            const res = await deleteStall(id);
            if (!res.success) {
                alert(res.error || "Failed to delete stall");
            }
        }
    };

    if (filteredStalls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <Store className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Stalls Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try searching with a different keyword or filter.</p>
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
                                Stall #
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Section / Category
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Vendor Occupant
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Status
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Rates (Daily / Monthly)
                            </TableHead>
                            <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStalls.map((item: StallItem) => (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                            >
                                {/* Stall # */}
                                <TableCell className="pl-8 py-4">
                                    <span className="font-black text-slate-900 dark:text-white text-xs uppercase italic tracking-wider">
                                        {item.stallNumber}
                                    </span>
                                </TableCell>

                                {/* Section */}
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <Tag className="w-3.5 h-3.5 text-purple-500" />
                                        <span>{item.stallType.name}</span>
                                    </div>
                                </TableCell>

                                {/* Vendor */}
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                                        <User className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{item.vendor?.name || <em className="text-slate-400">Unassigned</em>}</span>
                                    </div>
                                </TableCell>

                                {/* Status */}
                                <TableCell>{getStatusBadge(item.status)}</TableCell>

                                {/* Rates */}
                                <TableCell>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        <span>₱{item.dailyRate.toLocaleString()}</span>
                                        <span className="text-slate-400 font-normal italic text-[11px]"> / ₱{item.monthlyRate.toLocaleString()}</span>
                                    </div>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="pr-8 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedStall(item)}
                                            className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                            title="View Details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingStall(item);
                                                setIsEditOpen(true);
                                            }}
                                            className="h-8 w-8 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                            title="Edit Stall"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item.id, item.stallNumber)}
                                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                            title="Delete Stall"
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
