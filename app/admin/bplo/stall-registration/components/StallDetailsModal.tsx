"use client";

import React, { useEffect, useState } from "react";
import { useStalls } from "./StallsProvider";
import { User, X, CheckCircle2, ShieldAlert, Loader2, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStallDetails } from "../actions/stalls.actions";

export function StallDetailsModal() {
    const { selectedStall, setSelectedStall } = useStalls();
    const [fullDetails, setFullDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Fetch full stall details (otherFees, timestamps, createdBy) on demand
    useEffect(() => {
        if (!selectedStall) {
            setFullDetails(null);
            return;
        }

        let isMounted = true;
        setLoading(true);

        getStallDetails(selectedStall.id).then((res) => {
            if (isMounted) {
                setLoading(false);
                if (res.success && res.data) {
                    setFullDetails(res.data);
                }
            }
        });

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedStall(null);
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            isMounted = false;
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedStall, setSelectedStall]);

    if (!selectedStall) return null;
    const detailData = fullDetails || selectedStall;

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
                        {detailData.vendor ? (
                            <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white">
                                    {detailData.vendor.name || "Anonymous Vendor"}
                                </p>
                                <p className="text-xs text-slate-400 font-medium italic mt-0.5">
                                    {detailData.vendor.email || "No email provided"}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm font-bold text-slate-400 italic">No vendor assigned to this stall.</p>
                        )}
                    </div>

                    {/* Geospatial Map Pin Location Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase italic tracking-wider">
                                <MapPin size={14} className="text-rose-500" /> Geospatial Location & Address
                            </div>
                            {detailData.latitude && detailData.longitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${detailData.latitude},${detailData.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 hover:underline"
                                >
                                    <span>Open in Google Maps</span>
                                    <ExternalLink size={12} />
                                </a>
                            )}
                        </div>

                        {/* Physical Address Field */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040]">
                            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider mb-0.5">
                                Physical Address / Landmark
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {detailData.address || <em className="text-slate-400 font-normal italic">Public Market, Poblacion (No specific section address provided)</em>}
                            </p>
                        </div>
                        {detailData.latitude && detailData.longitude ? (
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] flex-1">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Latitude</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{Number(detailData.latitude).toFixed(6)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] flex-1">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Longitude</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{Number(detailData.longitude).toFixed(6)}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs font-bold text-slate-400 italic">No GPS coordinates pinned for this stall yet.</p>
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
                                <p className="text-lg font-black text-slate-900 dark:text-white">₱{detailData.dailyRate?.toLocaleString()}</p>
                                <span className="text-[10px] text-slate-400 font-medium italic">Overdue Fee: ₱{detailData.dailyRateOverdueFee?.toLocaleString()} / day</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Monthly Base Rate</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white">₱{detailData.monthlyRate?.toLocaleString()}</p>
                                <span className="text-[10px] text-slate-400 font-medium italic">Overdue Fee: ₱{detailData.monthlyRateOverdueFee?.toLocaleString()} / month</span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Fees Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-black uppercase italic tracking-widest text-slate-400">
                                Attached Custom Stall Fees
                            </h4>
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />}
                        </div>

                        {detailData.otherFees && detailData.otherFees.length > 0 ? (
                            <div className="space-y-2">
                                {detailData.otherFees.map((fee: any) => (
                                    <div
                                        key={fee.id}
                                        className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                {fee.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium italic">
                                                {fee.feeType || "DAILY"} {fee.remarks && `· ${fee.remarks}`}
                                            </span>
                                        </div>
                                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                                            ₱{fee.amount?.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : loading ? (
                            <div className="p-4 flex items-center justify-center text-xs font-bold text-slate-400 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading custom stall fees...
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic font-medium p-3 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040]">
                                No additional custom fees attached to this stall.
                            </p>
                        )}
                    </div>

                    {/* Metadata Timestamps */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-400 pt-2 border-t border-slate-100 dark:border-[#2a3040]">
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Registered On</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {detailData.createdAt ? format(new Date(detailData.createdAt), "MMMM d, yyyy") : "N/A"}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-black uppercase tracking-wider">Last Updated By</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {detailData.updatedBy || detailData.createdBy || "System"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
