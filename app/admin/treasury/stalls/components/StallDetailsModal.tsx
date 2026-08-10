"use client";

import React, { useEffect } from "react";
import { useStalls } from "./StallsProvider";
import { User, X, CheckCircle2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StallDetailsModal() {
    const { selectedStall, setSelectedStall } = useStalls();

    // Lock body scroll when modal is open & close on Escape key
    useEffect(() => {
        if (!selectedStall) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedStall(null);
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedStall, setSelectedStall]);

    if (!selectedStall) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OCCUPIED":
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow"><CheckCircle2 size={12} /> Occupied</span>;
            case "VACANT":
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">Vacant</span>;
            case "MAINTENANCE":
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow"><ShieldAlert size={12} /> Maintenance</span>;
            case "RESERVED":
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">Reserved</span>;
            default:
                return <span className="px-3 py-1 rounded-full bg-slate-800/90 backdrop-blur-md text-slate-300 text-[10px] font-black uppercase italic tracking-widest shadow">{status}</span>;
        }
    };

    return (
        <div
            onClick={() => setSelectedStall(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] space-y-3 bg-slate-50/50 dark:bg-[#1a202c]/50 relative">
                    <button
                        onClick={() => setSelectedStall(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase italic tracking-widest">
                            {selectedStall.stallType.name}
                        </span>
                        {getStatusBadge(selectedStall.status)}
                    </div>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight cursor-pointer line-clamp-1" title={selectedStall.stallNumber}>
                                    <span className="cursor-pointer truncate block">Stall {selectedStall.stallNumber}</span>
                                </h2>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                Stall {selectedStall.stallNumber}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Body Details */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar pr-3">
                    {/* Assigned Vendor Profile Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider mb-2">
                            <User size={14} className="text-blue-500" /> Assigned Vendor / Occupant
                        </div>
                        {selectedStall.vendor ? (
                            <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white">
                                    {selectedStall.vendor.name || "Anonymous Vendor"}
                                </p>
                                <p className="text-xs text-slate-400 font-medium italic mt-0.5">
                                    {selectedStall.vendor.email || "No email provided"}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm font-bold text-slate-400 italic">No vendor assigned to this stall.</p>
                        )}
                    </div>

                    {/* Financial Rates 2-Column Grid */}
                    <div>
                        <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400 mb-3">
                            Rental Fee Structure
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Daily Base Rate</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white">₱{selectedStall.dailyRate.toLocaleString()}</p>
                                <span className="text-[10px] text-slate-400 font-medium italic">Overdue Fee: ₱{selectedStall.dailyRateOverdueFee.toLocaleString()} / day</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Monthly Base Rate</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white">₱{selectedStall.monthlyRate.toLocaleString()}</p>
                                <span className="text-[10px] text-slate-400 font-medium italic">Overdue Fee: ₱{selectedStall.monthlyRateOverdueFee.toLocaleString()} / month</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Timestamps */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-400 pt-2 border-t border-slate-100 dark:border-[#2a3040]">
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Registered On</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {format(new Date(selectedStall.createdAt), "MMMM d, yyyy")}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Last Updated</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {format(new Date(selectedStall.updatedAt), "MMMM d, yyyy")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
