"use client";

import React, { useEffect } from "react";
import { format } from "date-fns";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { 
    Eye, 
    CheckCircle2, 
    Clock, 
    XCircle,
    MapPin,
    Calendar,
    UserCircle,
    Image as ImageIcon,
    Home,
    FileText,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface MayorReportDetailItem {
    id: string;
    category: string;
    description: string;
    status: string;
    images: string[];
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    adminComment: string | null;
    createdAt: Date | string;
    user: {
        name: string | null;
        email: string | null;
    };
    barangay?: {
        id: string;
        name: string;
    } | null;
}

interface MayorReportDetailModalProps {
    report: MayorReportDetailItem | null;
    onClose: () => void;
    themeColor?: string;
}

function formatFormattedName(fullName?: string | null) {
    if (!fullName) return "Anonymous Resident";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

export function MayorReportDetailModal({ report, onClose, themeColor = "#2563eb" }: MayorReportDetailModalProps) {
    const [viewerOpen, setViewerOpen] = React.useState(false);
    const [viewerUrl, setViewerUrl] = React.useState("");
    const [viewerIndex, setViewerIndex] = React.useState(0);
    const [viewerTitle, setViewerTitle] = React.useState("");

    useEffect(() => {
        if (!report) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [report, onClose]);

    if (!report) return null;

    const handleViewImage = (url: string, index: number) => {
        setViewerUrl(url);
        setViewerIndex(index);
        setViewerTitle(`Report Photo #${index + 1}`);
        setViewerOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold"><Clock className="w-3 h-3 mr-1" /> PENDING</Badge>;
            case "SEEN":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold"><Eye className="w-3 h-3 mr-1" /> SEEN</Badge>;
            case "IN_PROGRESS":
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 font-bold"><Clock className="w-3 h-3 mr-1" /> IN PROGRESS</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-bold"><XCircle className="w-3 h-3 mr-1" /> REJECTED</Badge>;
            default:
                return <Badge variant="outline" className="font-bold">{status}</Badge>;
        }
    };

    return (
        <>
            <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
                <DialogContent 
                    onPointerDownOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    onInteractOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    className="w-full sm:max-w-4xl bg-white dark:bg-[#0f1117] border-slate-200 dark:border-white/10 p-0 overflow-hidden rounded-[2rem] flex flex-col max-h-[92vh] shadow-2xl transition-all duration-300 cursor-default"
                >
                    {/* Top Accent line using theme color */}
                    <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: themeColor }} />

                    {/* Modal Header */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 shrink-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                    variant="outline" 
                                    style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20`, color: themeColor }}
                                    className="font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                >
                                    {report.category}
                                </Badge>
                            </div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                                <span>Report Overview</span>
                            </DialogTitle>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Status:</span>
                            {getStatusBadge(report.status)}
                        </div>
                    </div>

                    {/* Modal Scrollable Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                            
                            {/* Left Column: Reporter & Issue Description */}
                            <div className="lg:col-span-7 space-y-6">
                                
                                {/* Reporter & Details Card */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <UserCircle className="w-4 h-4 text-slate-400" /> Reporter Details
                                    </h4>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                                            <UserCircle className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-950 dark:text-white truncate">
                                                {formatFormattedName(report.user.name)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Barangay Scope</span>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{report.barangay?.name || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Filed Date</span>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                {format(new Date(report.createdAt), "LLL d, yyyy h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Issue Description Card */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Issue Description
                                    </h4>
                                    <div 
                                        className="text-[15px] text-slate-850 dark:text-slate-150 leading-relaxed font-normal pl-4 border-l-4 whitespace-pre-wrap" 
                                        style={{ borderLeftColor: themeColor }}
                                    >
                                        {report.description || "No description provided."}
                                    </div>
                                </div>

                                {/* Official Remarks / Admin Comment (Read-Only if present) */}
                                {report.adminComment && (
                                    <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Official Remarks / Resolution Notes
                                        </h4>
                                        <p className="text-sm italic text-slate-700 dark:text-slate-300">
                                            &quot;{report.adminComment}&quot;
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Attached Photos & Location Map */}
                            <div className="lg:col-span-5 space-y-6">
                                
                                {/* Photos Section */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-slate-400" /> Attached Photos ({(report.images || []).length})
                                    </h4>
                                    
                                    {(report.images || []).length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {(report.images || []).map((img, i) => (
                                                <div 
                                                    key={i} 
                                                    className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200" 
                                                    onClick={() => handleViewImage(img, i)}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={img} 
                                                        alt={`report-photo-${i}`} 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-xs text-slate-400 italic">
                                            No photos attached.
                                        </div>
                                    )}
                                </div>

                                {/* Location Card */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400" /> Location Pin
                                        </h4>
                                        {report.latitude !== null && report.longitude !== null && (
                                            <Button 
                                                variant="link" 
                                                size="sm" 
                                                onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
                                                className="text-xs h-auto p-0 font-semibold flex items-center gap-1 hover:no-underline"
                                                style={{ color: themeColor }}
                                            >
                                                Google Maps
                                            </Button>
                                        )}
                                    </div>

                                    {report.latitude !== null && report.longitude !== null ? (
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug line-clamp-2">
                                                {report.address || `${typeof report.latitude === 'number' ? report.latitude.toFixed(6) : report.latitude}, ${typeof report.longitude === 'number' ? report.longitude.toFixed(6) : report.longitude}`}
                                            </p>
                                            <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 relative">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    frameBorder="0"
                                                    scrolling="no"
                                                    marginHeight={0}
                                                    marginWidth={0}
                                                    src={`https://maps.google.com/maps?q=${report.latitude},${report.longitude}&hl=en&z=14&output=embed`}
                                                    className="w-full h-full grayscale-[0.1]"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-xs text-slate-450 italic">
                                            No location data available.
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
                documents={(report.images || []).map((img, idx) => ({ url: img, label: `Photo ${idx + 1}` }))}
                initialIndex={viewerIndex}
            />
        </>
    );
}
