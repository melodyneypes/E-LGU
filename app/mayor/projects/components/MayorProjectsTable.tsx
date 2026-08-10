"use client";

import { useMayorProjects, MayorProject } from "./MayorProjectsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FolderKanban, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MayorProjectDetailsModal } from "./MayorProjectDetailsModal";

export function MayorProjectsTable() {
    const {
        projects,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useMayorProjects();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedProject, setSelectedProject] = useState<MayorProject | null>(null);
    const projectIdParam = searchParams.get("projectId");

    // Auto-open modal when projectId URL parameter is present
    useEffect(() => {
        if (!projectIdParam) return;
        const found = projects.find((p) => p.id === projectIdParam);
        if (found) {
            setSelectedProject(found);
        } else {
            // Fetch directly from API if project is not in current initial page
            (async () => {
                try {
                    const res = await fetch(`/api/projects/${projectIdParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.project) {
                            setSelectedProject(data.project);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch project details:", err);
                }
            })();
        }
    }, [projectIdParam, projects]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRange = Math.min(page * pageSize, totalCount);

    const updateUrlParam = (paramName: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, value);
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            updateUrlParam("page", newPage.toString());
        }
    };

    const handlePageSizeChange = (newSize: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("pageSize", newSize);
        params.set("page", "1");
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            Planned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
            Ongoing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
            Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            Suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
        };
        const colorClass = colors[status] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
        return (
            <span className={cn("inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", colorClass)}>
                {status}
            </span>
        );
    };

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/5"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary-theme, #2563eb) 10%, transparent)" }}
                >
                    <FolderKanban className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                    No Projects Found
                </h3>
                <p className="text-slate-500 font-medium italic max-w-sm mt-2">
                    No municipal projects match your search query. Try modifying your filter settings.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Details Modal */}
            <MayorProjectDetailsModal
                project={selectedProject}
                open={!!selectedProject}
                onClose={() => {
                    setSelectedProject(null);
                    if (searchParams.get("projectId")) {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("projectId");
                        router.push(`${pathname}?${params.toString()}`);
                    }
                }}
                themeColor={themeColor}
            />

            <div className="overflow-x-auto relative">
                {isPending && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#151b2b]/60 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-300">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 shadow-xl">
                            <span
                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: themeColor, borderTopColor: "transparent" }}
                            />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 italic">
                                Refreshing projects...
                            </span>
                        </div>
                    </div>
                )}

                <Table className={cn("transition-opacity duration-300", isPending && "opacity-40")}>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e]">
                        <TableRow className="border-b dark:border-[#2a3040]">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Project Info
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14">
                                Location & Scope
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pr-8">
                                Status & Progress
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.map((item: MayorProject) => (
                            <TableRow
                                key={item.id}
                                onClick={() => setSelectedProject(item)}
                                className={cn(
                                    "group border-b dark:border-[#2a3040] hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,transparent)] transition-colors cursor-pointer",
                                    !item.isPublished && "opacity-60"
                                )}
                            >
                                {/* Project Info */}
                                <TableCell className="pl-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                            {item.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <FolderKanban className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            {/* Title with tooltip */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight cursor-default">
                                                            {item.title.length > 50
                                                                ? item.title.slice(0, 50) + "..."
                                                                : item.title}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="top"
                                                        className="max-w-[380px] text-xs font-bold italic uppercase bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3 rounded-xl shadow-xl"
                                                    >
                                                        {item.title}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Location */}
                                <TableCell>
                                    <div className="flex items-center text-slate-600 dark:text-slate-300 text-xs font-bold gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span className="line-clamp-1 max-w-[200px]">{item.location}</span>
                                    </div>
                                    {item.barangay && (
                                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            {item.barangay}
                                        </span>
                                    )}
                                </TableCell>

                                {/* Status & Progress */}
                                <TableCell className="pr-8">
                                    <div className="flex flex-col space-y-1.5 min-w-[140px] max-w-[200px]">
                                        <StatusBadge status={item.status} />
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${item.progress}%`, backgroundColor: themeColor }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500">{item.progress}%</span>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> projects
                    </span>
                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                            Rows per page:
                        </span>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                    </Button>
                    <span className="text-xs font-black px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => handlePageChange(page + 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </>
    );
}
