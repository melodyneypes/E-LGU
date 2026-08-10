import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MayorProject } from "./MayorProjectsProvider";
import {
    Calendar, MapPin, Building2, Tag, X,
    DollarSign, Briefcase,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatDate(dateInput: Date | string | null | undefined) {
    if (!dateInput) return "N/A";
    return new Date(dateInput).toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function MayorProjectDetailsModal({
    project,
    open,
    onClose,
    themeColor,
}: {
    project: MayorProject | null;
    open: boolean;
    onClose: () => void;
    themeColor: string;
}) {
    if (!project) return null;

    const colors: Record<string, string> = {
        Planned: "text-purple-500 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800",
        Ongoing: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
        Completed: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800",
        Suspended: "text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
    };

    const statusClass = colors[project.status] || "text-slate-500 bg-slate-50 border";

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-2xl p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl"
            >
                <div className="relative flex flex-col max-h-[90vh]">
                    {/* Header Banner (Only shown if imageUrl exists) */}
                    {project.imageUrl ? (
                        <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-[#1e2330] shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={project.imageUrl}
                                alt={project.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                            {/* Explicit X close button on top right of banner */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-950/50 backdrop-blur-md text-white hover:bg-slate-900 border border-white/20 shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>

                            {/* Banner Badges & Title */}
                            <div className="absolute bottom-4 left-6 right-6 z-10">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="px-3 py-1 rounded-full bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                        {project.category}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md text-slate-200 text-[10px] font-black uppercase italic tracking-widest shadow">
                                        {project.status}
                                    </span>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DialogTitle className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight drop-shadow-md line-clamp-1 cursor-pointer block" title={project.title}>
                                                <span className="cursor-pointer truncate block">{project.title}</span>
                                            </DialogTitle>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                            {project.title}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    ) : (
                        /* Collapsed Text Header when no image is present */
                        <DialogHeader
                            className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-start justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-[#1a202c]/50"
                        >
                            <div className="flex items-start gap-3 min-w-0">
                                <div
                                    className="p-2.5 rounded-xl shadow-lg shrink-0"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}
                                >
                                    <Tag className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight cursor-pointer line-clamp-1" title={project.title}>
                                                    <span className="cursor-pointer truncate block">{project.title}</span>
                                                </DialogTitle>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                                {project.title}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" />
                                            {project.category}
                                        </span>
                                        <span>·</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                                            {project.status}
                                        </span>
                                    </DialogDescription>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </DialogHeader>
                    )}

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto custom-scrollbar p-6 pb-8 space-y-5 flex-1">

                        {/* Progress Bar Container */}
                        <div className="p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a1f2e]/40 space-y-2">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                <span>Overall Project Progress</span>
                                <span style={{ color: themeColor }}>{project.progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${project.progress}%`, backgroundColor: themeColor }}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        {project.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-l-4 pl-4 italic"
                                style={{ borderColor: themeColor }}>
                                {project.description}
                            </p>
                        )}

                        {/* Grid Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Budget */}
                            {project.budget && (
                                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                        <DollarSign className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Budget</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                            {project.budget}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Contractor */}
                            {project.contractor && (
                                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Contractor / Agency</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {project.contractor}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
                                    <Calendar className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {formatDate(project.startDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 shrink-0">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Target End Date</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {formatDate(project.endDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040] sm:col-span-2">
                                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0">
                                    <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Location Details</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{project.location}</p>
                                    {project.barangay && (
                                        <p className="text-[10px] text-slate-500 font-medium">Barangay {project.barangay}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
