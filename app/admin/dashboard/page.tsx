 
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
import { BarangaySwitcher } from "../components/BarangaySwitcher";
import { Download, Plus, Users, Briefcase, AlertTriangle, Hammer, MapPin } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminDashboard(props: { searchParams: Promise<{ barangay?: string }> }) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    // Redirect Treasury Staff and Admin Aide to their specific hub immediately
    if (user?.role === "TREASURY_STAFF" || user?.role === "ADMIN_AIDE") {
        redirect("/admin/treasury");
    }

    // Redirect BPLO Admin directly to their permits hub
    if (user?.role === "ADMIN" && user?.department?.toUpperCase() === "BPLO") {
        redirect("/admin/bplo");
    }

    // Redirect Registrar Admin directly to their registrar hub
    if (user?.role === "ADMIN" && (user?.department?.toUpperCase() === "REGISTRAR" || user?.department?.toUpperCase() === "CIVIL_REGISTRY")) {
        redirect("/admin/registrar");
    }

    // Redirect Engineer to their Building Permit hub
    if (user?.role === "ENGINEER") {
        redirect("/admin/engineer");
    }

    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";
    const isAdmin = user?.role === "ADMIN";

    const params = await props.searchParams;
    const selectedBarangay = isBarangayAdmin ? user.managedBarangay : params.barangay;

    const [settings, residentsCount, jobsCount, reportsCount, projectsCount, activeBarangays] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.resident.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        prisma.job.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.project.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        isAdmin ? prisma.barangayInfo.findMany({ orderBy: { name: "asc" }, select: { name: true } }) : []
    ]);

    const themeColor = settings.get("theme_color") || "#2563eb";

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040]">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2 italic">
                        <MapPin size={12} />
                        <span>System Scope: {selectedBarangay || "Global Mapandan"}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Command Center
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Welcome, {user.name || "Administrator"}. Viewing data for <span className="text-slate-900 dark:text-white font-bold">{selectedBarangay || "all administrative sectors"}</span>.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {isAdmin && (
                        <BarangaySwitcher 
                            availableBarangays={activeBarangays.map(b => b.name)} 
                            currentBarangay={selectedBarangay} 
                            themeColor={themeColor} 
                        />
                    )}
                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-5 py-3 bg-white dark:bg-[#1e2330] hover:bg-slate-50 dark:hover:bg-[#2a3040] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3040] rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all shadow-sm">
                            <Download size={14} />
                            <span>Export Ledger</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Residents Card */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute -top-4 -right-4 text-blue-100 dark:text-blue-500/10 transition-transform group-hover:scale-110">
                        <Users size={120} strokeWidth={1} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Registry</p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{residentsCount.toLocaleString()}</h2>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-600 italic">
                        <span className="bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-full">Validated Records</span>
                    </div>
                </div>

                {/* Jobs Card */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                     <div className="absolute -top-4 -right-4 text-emerald-100 dark:text-emerald-500/10 transition-transform group-hover:scale-110">
                        <Briefcase size={120} strokeWidth={1} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Occupation Hub</p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{jobsCount.toLocaleString()}</h2>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 italic">
                        <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">Active Opportunities</span>
                    </div>
                </div>

                {/* Reports Card */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute -top-4 -right-4 text-orange-100 dark:text-orange-500/10 transition-transform group-hover:scale-110">
                        <AlertTriangle size={120} strokeWidth={1} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Public Reports</p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{reportsCount.toLocaleString()}</h2>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-orange-600 italic">
                        <span className="bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-full">Pending Response</span>
                    </div>
                </div>

                {/* Projects Card */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute -top-4 -right-4 text-purple-100 dark:text-purple-500/10 transition-transform group-hover:scale-110">
                        <Hammer size={120} strokeWidth={1} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Infra Tracker</p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{projectsCount.toLocaleString()}</h2>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-purple-600 italic">
                         <span className="bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-full">Active Works</span>
                    </div>
                </div>
            </div>

            {/* Middle Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions (Col-span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Strategic Operations</h3>
                    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[3rem] shadow-xl overflow-hidden">
                        {[
                            { title: "Manage Content", desc: "Create announcements or town hall updates.", icon: Plus, color: "blue", action: "Add News Post" },
                            { title: "Infrastructure Hub", desc: "Update road works and construction progress.", icon: Hammer, color: "purple", action: "Review Projects" },
                            { title: "Gallery Management", desc: "Feature local spots or businesses.", icon: MapPin, color: "emerald", action: "Update Gallery" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-8 flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-0 border-slate-100 dark:border-[#2a3040] gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
                                <div className="flex items-start space-x-6">
                                    <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-500/10 flex items-center justify-center shrink-0`}>
                                        <item.icon className={`w-7 h-7 text-${item.color}-600`} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-tight uppercase italic">{item.title}</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic mt-1">{item.desc}</p>
                                    </div>
                                </div>
                                <button className={`whitespace-nowrap px-6 py-3 bg-${item.color === 'blue' ? 'blue-600' : 'white'} ${item.color === 'blue' ? 'text-white' : 'dark:bg-[#1e2330] text-slate-700 dark:text-slate-200'} rounded-2xl text-xs font-black uppercase italic transition-all shadow-lg active:scale-95`}>
                                    {item.action}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity (Col-span 1) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Activity Logs</h3>
                        <button className="text-blue-600 dark:text-blue-500 text-[10px] font-black uppercase tracking-widest italic hover:opacity-80 transition-all">Audit Trail</button>
                    </div>

                    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[3rem] p-8 shadow-xl relative min-h-[400px]">
                        <ul className="space-y-8 relative before:absolute before:inset-y-0 before:left-[11px] before:w-1 before:bg-slate-100 dark:before:bg-[#2a3040] before:rounded-full">
                            {[
                                { user: "Maria Santos", type: "Report", action: "submitted a new public report", details: "Street Light Repair", time: "10 mins ago", color: "blue" },
                                { user: "Admin", type: "Job", action: "New application received for", details: "Administrative Assistant", time: "2 hours ago", color: "emerald" },
                                { user: "System", type: "System", action: "System backup completed successfully", details: null, time: "5 hours ago", color: "blue" },
                                { user: "Admin", type: "Project", action: "Updated details for", details: "Sabangan Beach Project", time: "1 day ago", color: "orange" }
                            ].map((activity, idx) => (
                                <li key={idx} className="relative pl-10 group cursor-default">
                                    <span className={`absolute left-[8px] top-1.5 w-3 h-3 rounded-full bg-${activity.color}-500 ring-4 ring-white dark:ring-[#151b2b] shadow-xl group-hover:scale-125 transition-transform`}></span>
                                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium italic leading-relaxed">
                                        <strong className="text-slate-900 dark:text-white not-italic">{activity.user}</strong> {activity.action} {activity.details && <strong className="text-slate-900 dark:text-white not-italic">{activity.details}</strong>}.
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 opacity-60 italic">{activity.time}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

