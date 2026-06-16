"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { 
    Eye, 
    MoreVertical, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    XCircle,
    MapPin,
    Calendar,
    UserCircle,
    Image as ImageIcon,
    Loader2
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateReportStatus } from "@/app/admin/actions";


interface Report {
    id: string;
    category: string;
    description: string;
    status: string;
    images: string[];
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    adminComment: string | null;
    createdAt: Date;
    user: {
        name: string | null;
        email: string | null;
    };
}

export function ReportsTable({ initialReports }: { initialReports: Report[] }) {
    const [reports, setReports] = useState(initialReports);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminComment, setAdminComment] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState("");

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [viewerIndex, setViewerIndex] = useState(0);

    const handleViewImage = (url: string, index: number) => {
        setViewerUrl(url);
        setViewerTitle(`${selectedReport?.category || "Report"} Photo`);
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase tracking-widest text-[9px] italic"><Clock className="w-3 h-3 mr-1" /> PENDING</Badge>;
            case "SEEN":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase tracking-widest text-[9px] italic"><Eye className="w-3 h-3 mr-1" /> SEEN</Badge>;
            case "IN_PROGRESS":
                return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] italic"><AlertTriangle className="w-3 h-3 mr-1" /> IN PROGRESS</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] italic"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase tracking-widest text-[9px] italic"><XCircle className="w-3 h-3 mr-1" /> REJECTED</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setIsUpdating(true);
        try {
            const res = await updateReportStatus(id, newStatus, adminComment);
            if (res.success) {
                setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, adminComment: adminComment || r.adminComment } : r));
                toast.success(`Status updated to ${newStatus}`);
                if (selectedReport?.id === id) {
                    setSelectedReport(prev => prev ? { ...prev, status: newStatus, adminComment: adminComment || prev.adminComment } : null);
                    setCurrentStatus(newStatus);
                }
            } else {
                toast.error(res.error || "Update failed");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleOpenDetails = (report: Report) => {
        setSelectedReport(report);
        setAdminComment(report.adminComment || "");
        setCurrentStatus(report.status);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2a3040]">
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Reporter</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Category</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Date</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Status</TableHead>
                            <TableHead className="text-right font-black uppercase tracking-widest text-[10px] italic py-5 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length > 0 ? reports.map((report) => (
                            <TableRow 
                                key={report.id} 
                                className="border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                onClick={() => handleOpenDetails(report)}
                            >
                                <TableCell className="py-5 font-bold">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UserCircle className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black italic">{report.user.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{report.user.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 italic bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">{report.category}</span>
                                </TableCell>
                                <TableCell className="py-5 text-xs font-medium italic text-slate-500">
                                    {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}
                                </TableCell>
                                <TableCell className="py-5">
                                    {getStatusBadge(report.status)}
                                </TableCell>
                                <TableCell className="text-right py-5 px-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleOpenDetails(report)}
                                            className="hover:bg-primary/10 hover:text-primary transition-colors rounded-xl"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl p-2 min-w-[160px]">
                                                <div className="px-2 py-1.5 mb-1 bg-slate-100 dark:bg-white/5 rounded-lg">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Quick Status Update</p>
                                                </div>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "SEEN")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-500/10 hover:text-blue-500 transition-colors">SEEN</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "IN_PROGRESS")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 transition-colors">IN PROGRESS</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "COMPLETED")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors">COMPLETED</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "REJECTED")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-red-500/10 hover:text-red-500 transition-colors text-red-500">REJECTED</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="py-20 text-center">
                                    <AlertTriangle className="w-10 h-10 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No reports found...</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detailed View Modal */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent 
                    onPointerDownOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    onInteractOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    className="w-full sm:max-w-2xl bg-white dark:bg-[#0f1117] border-slate-200 dark:border-white/10 p-0 overflow-hidden rounded-[2.5rem] flex flex-col max-h-[90vh]"
                >
                    <div className="p-8 pb-4 shrink-0">
                        <DialogHeader>
                            <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-3xl border border-primary/10">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-primary" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Report <span className="text-primary">Summary</span></DialogTitle>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 italic mt-0.5">Reference: {selectedReport?.id}</p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {selectedReport && (
                        <>
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-6 space-y-8">
                                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><UserCircle className="w-3 h-3" /> Submitted By</p>
                                            <p className="text-sm font-black italic">{selectedReport.user.name}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><Calendar className="w-3 h-3" /> Submitted On</p>
                                            <p className="text-sm font-black italic">{format(new Date(selectedReport.createdAt), "LLL d, yyyy")}</p>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Category</p>
                                                <p className="text-xl font-black tracking-tight">{selectedReport.category}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic mr-1">Current Status</p>
                                                {getStatusBadge(selectedReport.status)}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic border-b border-slate-200 dark:border-white/10 pb-1">Detailed Description</p>
                                            <p className="text-sm font-medium leading-relaxed italic text-slate-600 dark:text-slate-400">{selectedReport.description}</p>
                                        </div>
                                    </div>

                                    {/* Images Section */}
                                    {selectedReport.images.length > 0 && (
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Attached Photos</p>
                                            <div className="grid grid-cols-4 gap-3">
                                                {selectedReport.images.map((img, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="aspect-square relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg group cursor-pointer" 
                                                        onClick={() => handleViewImage(img, i)}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={img} alt={`report-${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Location Section */}
                                    {selectedReport.latitude && (
                                        <div className="space-y-4 bg-slate-900 rounded-3xl p-6 border border-white/10 shadow-3xl text-white">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic flex items-center gap-2 font-black italic"><MapPin className="w-3 h-3 text-red-500" /> Precise Location Pin</p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => window.open(`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`, '_blank')}
                                                    className="text-[9px] font-black uppercase tracking-widest h-auto p-0 hover:bg-transparent hover:text-primary italic"
                                                >
                                                    Open in Google Maps
                                                </Button>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-medium leading-relaxed italic text-slate-400">{selectedReport.address || "Location pinned on map by reporter."}</p>
                                                <p className="text-[10px] font-mono text-slate-600 tracking-tighter">{selectedReport.latitude}, {selectedReport.longitude}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin Action Management */}
                                    <div className="space-y-6 border-t border-slate-200 dark:border-white/10 pt-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Update Report Status</label>
                                                <Select value={currentStatus} onValueChange={(val) => setCurrentStatus(val)}>
                                                    <SelectTrigger className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold italic text-sm">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl">
                                                        <SelectItem value="PENDING" className="font-bold py-3 italic">PENDING</SelectItem>
                                                        <SelectItem value="SEEN" className="font-bold py-3 italic">SEEN</SelectItem>
                                                        <SelectItem value="IN_PROGRESS" className="font-bold py-3 italic">IN PROGRESS</SelectItem>
                                                        <SelectItem value="COMPLETED" className="font-bold py-3 italic text-emerald-400">COMPLETED</SelectItem>
                                                        <SelectItem value="REJECTED" className="font-bold py-3 italic text-red-400">REJECTED</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">LGU Official Remarks</label>
                                                <Textarea 
                                                    placeholder="Add updates for the resident..." 
                                                    value={adminComment}
                                                    onChange={(e) => setAdminComment(e.target.value)}
                                                    className="min-h-[80px] rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 italic text-sm font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Action Footer */}
                            <div className="p-8 pt-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
                                <Button 
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(selectedReport.id, currentStatus)}
                                    className="w-full h-14 rounded-2xl bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-xs italic shadow-xl shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {isUpdating ? "Applying Changes..." : "Apply Status & Send Feedback"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
                documents={selectedReport?.images.map((img, idx) => ({ url: img, label: `Photo ${idx + 1}` }))}
                initialIndex={viewerIndex}
            />
        </div>
    );
}
