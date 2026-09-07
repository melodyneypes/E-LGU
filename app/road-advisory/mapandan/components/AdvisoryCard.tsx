"use client";

import React from "react";
import { format } from "date-fns";
import { 
    Navigation, 
    Clock, 
    MapPin, 
    ArrowRight,
    CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdvisoryCardProps {
    advisory: any;
    isSelected: boolean;
    onSelect: () => void;
}

export function AdvisoryCard({ advisory, isSelected, onSelect }: AdvisoryCardProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CLOSED":
                return (
                    <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Road Closed
                    </Badge>
                );
            case "PARTIALLY_CLOSED":
                return (
                    <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Partially Passable
                    </Badge>
                );
            case "DETOUR_ONLY":
                return (
                    <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Detour Advised
                    </Badge>
                );
            case "REOPENED":
                return (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider gap-1.5 py-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Reopened
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case "CRITICAL":
                return <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Critical Priority</span>;
            case "HIGH":
                return <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">High Advisory</span>;
            case "MODERATE":
                return <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Moderate Warning</span>;
            case "LOW":
                return <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Notice</span>;
            default:
                return null;
        }
    };

    return (
        <div 
            onClick={onSelect}
            className={`p-6 rounded-3xl cursor-pointer transition-all duration-300 text-left relative overflow-hidden group shadow-lg ${
                isSelected 
                    ? "bg-slate-900 ring-2 ring-blue-500/50 shadow-2xl scale-[1.01]" 
                    : "bg-slate-900/80 hover:bg-slate-900 shadow-lg"
            }`}
        >
            {/* Top Row: Status & Severity */}
            <div className="flex items-center justify-between gap-3 mb-3">
                {getStatusBadge(advisory.status)}
                {getSeverityBadge(advisory.severity)}
            </div>

            {/* Title & Road Name */}
            <div className="space-y-1 mb-4">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase italic leading-tight group-hover:text-blue-400 transition-colors">
                    {advisory.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                        {advisory.roadName ? `${advisory.roadName}` : "Local Road"} 
                        {advisory.barangay ? ` • Brgy. ${advisory.barangay}` : ""}
                    </span>
                </div>
            </div>

            {/* Landmarks / Start to End */}
            {(advisory.startLocation?.address || advisory.endLocation?.address) && (
                <div className="p-3 rounded-2xl bg-slate-950/70 mb-4 flex items-center justify-between gap-2 text-xs font-semibold text-slate-300">
                    <div className="truncate flex-1">
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block mb-0.5">Start</span>
                        <p className="truncate">{advisory.startLocation?.address || "Start Coordinates"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="truncate flex-1 text-right">
                        <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block mb-0.5">End</span>
                        <p className="truncate">{advisory.endLocation?.address || "End Coordinates"}</p>
                    </div>
                </div>
            )}

            {/* Detour Advice Box */}
            {advisory.detourAdvice && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Recommended Detour Route</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium italic leading-relaxed">
                        {advisory.detourAdvice}
                    </p>
                </div>
            )}

            {/* Bottom Metadata: Schedule & Timestamps */}
            <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                        {advisory.startDate ? format(new Date(advisory.startDate), "MMM d, yyyy") : "Active"}
                        {advisory.endDate ? ` until ${format(new Date(advisory.endDate), "MMM d, yyyy")}` : " (Ongoing)"}
                    </span>
                </div>
            </div>
        </div>
    );
}
