"use client";

import React, { useEffect } from "react";
import { useStallTypes } from "./StallTypesProvider";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StallTypeDetailsModal() {
    const { selectedStallType, setSelectedStallType } = useStallTypes();

    // Lock body scroll when modal is open & close on Escape key
    useEffect(() => {
        if (!selectedStallType) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedStallType(null);
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedStallType, setSelectedStallType]);

    if (!selectedStallType) return null;

    return (
        <div
            onClick={() => setSelectedStallType(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] space-y-2 bg-slate-50/50 dark:bg-[#1a202c]/50 relative">
                    <button
                        onClick={() => setSelectedStallType(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase italic tracking-widest inline-block">
                        Code: {selectedStallType.code}
                    </span>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight cursor-pointer line-clamp-1" title={selectedStallType.name}>
                                    <span className="cursor-pointer truncate block">{selectedStallType.name}</span>
                                </h2>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                {selectedStallType.name}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Body Details */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar pr-3">
                    {/* Description */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Description</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic bg-slate-50 dark:bg-[#1a202c] p-3 rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                            {selectedStallType.description || "No description provided."}
                        </p>
                    </div>



                    {/* Metadata Timestamps */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-400 pt-2 border-t border-slate-100 dark:border-[#2a3040]">
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Created On</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {format(new Date(selectedStallType.createdAt), "MMMM d, yyyy")}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Last Updated</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {format(new Date(selectedStallType.updatedAt), "MMMM d, yyyy")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
