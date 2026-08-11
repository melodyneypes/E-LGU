"use client";

import React from "react";
import { useOtherFees } from "./OtherFeesProvider";
import { DollarSign, Edit, Trash2, Eye, Store, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteOtherFee } from "../actions";

export function OtherFeesCardsGrid() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
                <div
                    key={item.id}
                    className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 group"
                >
                    <div>
                        {/* Fee Code Badge & Stalls Count */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider border border-emerald-500/20">
                                {item.code}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                                <Store size={12} className="text-blue-500" /> {item._count?.stalls || 0} stalls
                            </span>
                        </div>

                        {/* Fee Name */}
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-1">
                            {item.name}
                        </h3>

                        {/* Amount */}
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-2">
                            ₱{item.amount.toLocaleString()}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 italic mb-4">
                            {item.description || "No description provided."}
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#2a3040] pt-4 mt-2">
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFee(item)}
                                className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setAssigningFee(item);
                                    setIsAssignOpen(true);
                                }}
                                className="h-8 px-2.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1 cursor-pointer"
                                title="Assign to Stalls"
                            >
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span>Assign</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-1">
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
                    </div>
                </div>
            ))}
        </div>
    );
}
