import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getReportById } from "@/app/admin/actions";
import { format } from "date-fns";
import {
    XCircle,
    MessageSquare,
    Home,
    Activity,
    Share2,
    CalendarCheck,
    Navigation
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import EvidenceGallery from "@/components/shared/EvidenceGallery";

// Next.js 15+ requires params to be a Promise, but we handle it safely for both versions
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Await params if it behaves like a promise (for newer Next.js versions)
    const resolvedParams = await params;
    const reportId = resolvedParams.id;

    console.log(`[Reporting] Entry: Viewing details for ${reportId}`);

    const session = await getServerSession(authOptions);
    if (!session) {
        console.warn("[Reporting] No session found, redirecting to login");
        redirect("/auth/login");
    }

    const { report, success, error } = await getReportById(reportId);

    if (!success || !report) {
        console.error(`[Reporting] Failed to fetch report ${reportId}: ${error}`);
        return notFound();
    }

    return (
        <div className="space-y-4 md:space-y-8 pb-20 max-w-7xl mx-auto px-4 md:px-10 pt-4 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation - Glass Bar Sticky */}
            <div className="sticky top-[72px] md:top-[88px] z-50 w-fit pointer-events-none">
                <Breadcrumb className="pointer-events-auto">
                    <BreadcrumbList className="bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-[0_8px_32_rgba(0,0,0,0.1)] w-fit flex items-center gap-1">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    <Home className="w-3.5 h-3.5 mb-0.5" />
                                    Home
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="opacity-20" />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/user/reports" className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Reports Hub</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <div className="lg:col-span-8 space-y-6 md:space-y-8">
                    <div className="bg-white dark:bg-[#0d0f14] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Activity className="w-32 h-32" /></div>
                        
                        <div className="relative z-10 space-y-6 md:space-y-8">
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <Badge className="bg-primary text-white font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md text-[7px] md:text-[8px] italic border-none shadow-sm">
                                        {report.status.replace(/_/g, " ")}
                                    </Badge>
                                    <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/10" />
                                    <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{format(new Date(report.createdAt), "MMMM d, yyyy")}</span>
                                </div>
                                <h1 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                                    {report.category}
                                </h1>
                                <p className="text-xs md:text-base font-medium italic text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl border-l-4 border-primary/30 pl-4">
                                    &quot;{report.description}&quot;
                                </p>
                            </div>

                            {report.adminComment && (
                                <div className="p-4 md:p-6 bg-primary rounded-xl md:rounded-[1.5rem] text-white space-y-3 md:space-y-4 relative overflow-hidden shadow-2xl shadow-primary/30 group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
                                    <div className="flex items-center gap-2 relative z-10">
                                        <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center"><MessageSquare className="w-3 h-3" /></div>
                                        <h4 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest italic">LGU Service Response</h4>
                                    </div>
                                    <p className="text-sm md:text-lg font-bold italic leading-snug relative z-10 tracking-tight">
                                        &quot;{report.adminComment}&quot;
                                    </p>
                                    <div className="pt-3 border-t border-white/20 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[7px] md:text-[8px]">LGU</div>
                                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest italic opacity-80">Public Service Office • Mayors Office • eMapandan</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Share2 className="w-3.5 h-3.5 text-primary" />
                            <h4 className="text-xs md:text-sm font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Evidence Documentation</h4>
                        </div>
                        <EvidenceGallery images={report.images} category={report.category} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-4 md:space-y-6 lg:sticky lg:top-24 h-fit">
                    {/* Modern Integrated Map - Church Style */}
                    <div className="relative h-[250px] md:h-[300px] bg-slate-100 dark:bg-white/5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden group">
                        {report.latitude && report.longitude ? (
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://maps.google.com/maps?q=${report.latitude},${report.longitude}&hl=en&z=15&output=embed`}
                                className="w-full h-full grayscale-[0.2] contrast-[1.1]"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                                <XCircle className="w-8 h-8 text-slate-200 dark:text-white/5" />
                                <p className="text-[8px] font-bold text-slate-400 italic uppercase tracking-widest">No Location Data</p>
                            </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
                            <div className="space-y-0.5">
                                <p className="text-[8px] font-black uppercase tracking-widest text-white italic">Incident Location</p>
                                <p className="text-[9px] font-bold text-white/70 italic truncate max-w-[120px] md:max-w-[160px]">{report.address || report.category}</p>
                            </div>
                            {report.latitude && (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`} 
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-black uppercase italic tracking-widest text-[8px] transition-all hover:scale-105 shadow-xl shadow-primary/40"
                                >
                                    <Navigation className="w-3 h-3" />
                                    <span>Route</span>
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-950 rounded-2xl md:rounded-[2rem] p-4 md:p-6 text-white space-y-4 md:space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700"><CalendarCheck className="w-16 h-16" /></div>
                        
                        <div className="space-y-0.5 relative z-10">
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary italic leading-none">Record Log</p>
                            <h4 className="text-sm font-black italic tracking-tighter">Timeline</h4>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 text-slate-500 shrink-0">
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest italic">Response</span>
                                </div>
                                <span className="text-[9px] font-bold italic text-white/90">{report.adminComment ? "Official" : "Pending"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
