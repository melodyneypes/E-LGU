
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
import { BarangaySwitcher } from "../components/BarangaySwitcher";
import { Download, Plus, Users, Briefcase, AlertTriangle, Hammer, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { TransactionDashboardView } from "./components/TransactionDashboardView";
import { PaymentDashboardView } from "./components/PaymentDashboardView";
import { ResidentDashboardView } from "./components/ResidentDashboardView";
import { RecentAnnouncementsCard } from "./components/RecentAnnouncementsCard";
import { LatestNewsCard } from "./components/LatestNewsCard";
import { UpcomingEventsCard } from "./components/UpcomingEventsCard";

function getPhilippineDateString(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function getPhilippineDisplayString(date: Date): string {
    return date.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
    });
}

export default async function AdminDashboard(props: { searchParams: Promise<{ barangay?: string; from?: string; to?: string; category?: string; payFrom?: string; payTo?: string; payCategory?: string; payMethod?: string; resFrom?: string; resTo?: string; resGender?: string; resCivil?: string; resSector?: string }> }) {
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
    if (user?.role === "ENGINEER" || user?.role === "MPDC_ZONING") {
        redirect("/admin/engineer");
    }

    // Redirect BFP to their BFP hub
    if (user?.role === "BFP") {
        redirect("/admin/bfp");
    }

    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";
    const isAdmin = user?.role === "ADMIN";

    const params = await props.searchParams;
    const selectedBarangay = isBarangayAdmin ? user.managedBarangay : params.barangay;
    const selectedCategory = params.category || "ALL";

    // Parse payment filters
    const payCategory = params.payCategory || "ALL";
    const payMethod = params.payMethod || "ALL";

    // Parse resident filters
    const resGender = params.resGender || "ALL";
    const resCivil = params.resCivil || "ALL";
    const resSector = params.resSector || "ALL";

    // Parse date range params
    let fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    fromDate.setHours(0, 0, 0, 0);

    let toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (params.from) {
        const parsedFrom = new Date(params.from);
        if (!isNaN(parsedFrom.getTime())) {
            fromDate = parsedFrom;
            fromDate.setHours(0, 0, 0, 0);
        }
    }
    if (params.to) {
        const parsedTo = new Date(params.to);
        if (!isNaN(parsedTo.getTime())) {
            toDate = parsedTo;
            toDate.setHours(23, 59, 59, 999);
        }
    }

    // Parse payment date range params
    let payFromDate = new Date();
    payFromDate.setDate(payFromDate.getDate() - 30);
    payFromDate.setHours(0, 0, 0, 0);

    let payToDate = new Date();
    payToDate.setHours(23, 59, 59, 999);

    if (params.payFrom) {
        const parsedPayFrom = new Date(params.payFrom);
        if (!isNaN(parsedPayFrom.getTime())) {
            payFromDate = parsedPayFrom;
            payFromDate.setHours(0, 0, 0, 0);
        }
    }
    if (params.payTo) {
        const parsedPayTo = new Date(params.payTo);
        if (!isNaN(parsedPayTo.getTime())) {
            payToDate = parsedPayTo;
            payToDate.setHours(23, 59, 59, 999);
        }
    }

    // Parse resident date range params
    let resFromDate = new Date();
    resFromDate.setDate(resFromDate.getDate() - 30);
    resFromDate.setHours(0, 0, 0, 0);

    let resToDate = new Date();
    resToDate.setHours(23, 59, 59, 999);

    if (params.resFrom) {
        const parsedResFrom = new Date(params.resFrom);
        if (!isNaN(parsedResFrom.getTime())) {
            resFromDate = parsedResFrom;
            resFromDate.setHours(0, 0, 0, 0);
        }
    }
    if (params.resTo) {
        const parsedResTo = new Date(params.resTo);
        if (!isNaN(parsedResTo.getTime())) {
            resToDate = parsedResTo;
            resToDate.setHours(23, 59, 59, 999);
        }
    }

    const [settings, residentsCount, jobsCount, reportsCount, projectsCount, activeBarangays, transactionsList, categoriesList, paymentsList, residentsList, recentAnnouncements, latestNews, upcomingEvents, pastEvents] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.resident.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        prisma.job.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        prisma.report.count({ where: { status: "PENDING", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        prisma.project.count({ where: selectedBarangay ? { barangay: selectedBarangay } : {} }),
        isAdmin ? prisma.barangayInfo.findMany({ orderBy: { name: "asc" }, select: { name: true } }) : [],
        prisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate
                },
                ...(selectedCategory && selectedCategory !== "ALL" ? {
                    type: {
                        category: selectedCategory
                    }
                } : {}),
                ...(selectedBarangay ? {
                    user: {
                        residentProfile: {
                            barangay: selectedBarangay
                        }
                    }
                } : {})
            },
            select: {
                createdAt: true,
                status: true
            }
        }),
        prisma.transactionType.findMany({
            select: { category: true },
            distinct: ["category"]
        }),
        prisma.payment.findMany({
            where: {
                status: "PAID",
                createdAt: {
                    gte: payFromDate,
                    lte: payToDate
                },
                ...(payCategory && payCategory !== "ALL" ? {
                    transaction: {
                        type: {
                            category: payCategory
                        }
                    }
                } : {}),
                ...(payMethod && payMethod !== "ALL" ? {
                    method: payMethod as any
                } : {}),
                ...(selectedBarangay ? {
                    transaction: {
                        user: {
                            residentProfile: {
                                barangay: selectedBarangay
                            }
                        }
                    }
                } : {})
            },
            select: {
                amount: true,
                createdAt: true
            }
        }),
        prisma.resident.findMany({
            where: {
                registrationStatus: "APPROVED",
                category: {
                    name: "Resident"
                },
                createdAt: {
                    gte: resFromDate,
                    lte: resToDate
                },
                ...(selectedBarangay ? { barangay: selectedBarangay } : {}),
                ...(resGender && resGender !== "ALL" ? { gender: resGender } : {}),
                ...(resCivil && resCivil !== "ALL" ? { civilStatus: resCivil } : {}),
                ...(resSector === "SENIOR" ? { isSenior: true } : {}),
                ...(resSector === "PWD" ? { isPWD: true } : {}),
                ...(resSector === "SOLO_PARENT" ? { isSoloParent: true } : {}),
                ...(resSector === "FOUR_PS" ? { is4Ps: true } : {})
            },
            select: {
                createdAt: true
            }
        }),
        prisma.announcement.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                priority: true,
                category: true,
                isActive: true,
                createdAt: true
            }
        }),
        prisma.news.findMany({
            orderBy: { publishDate: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                author: true,
                category: true,
                imageUrl: true,
                isPublished: true,
                publishDate: true
            }
        }),
        prisma.event.findMany({
            where: {
                endDate: { gte: new Date() },
                isPublished: true
            },
            orderBy: { startDate: "asc" },
            take: 5,
            select: {
                id: true,
                title: true,
                category: true,
                startDate: true,
                endDate: true,
                venueName: true,
                isPublished: true
            }
        }),
        prisma.event.findMany({
            where: {
                endDate: { lt: new Date() },
                isPublished: true
            },
            orderBy: { endDate: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                category: true,
                startDate: true,
                endDate: true,
                venueName: true,
                isPublished: true
            }
        })
    ]);

    const themeColor = settings.get("theme_color") || "#2563eb";
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    // Map dashboard chart statistics for requests dynamically based on date range
    const chartDataMap: {
        [key: string]: {
            date: string;
            requests: number;
            evaluation: number;
            processing: number;
            released: number;
            rejected: number;
        };
    } = {};

    const currentCursor = new Date(fromDate);
    let safetyCounter = 0;
    while (currentCursor <= toDate && safetyCounter < 400) {
        const dateStr = getPhilippineDisplayString(currentCursor);
        const key = getPhilippineDateString(currentCursor);
        chartDataMap[key] = {
            date: dateStr,
            requests: 0,
            evaluation: 0,
            processing: 0,
            released: 0,
            rejected: 0,
        };
        currentCursor.setDate(currentCursor.getDate() + 1);
        safetyCounter++;
    }

    transactionsList.forEach((tx) => {
        const key = getPhilippineDateString(tx.createdAt);
        if (chartDataMap[key]) {
            chartDataMap[key].requests += 1;
            
            if (tx.status === "FOR_REQUESTING" || tx.status === "FOR_INSPECTION" || tx.status === "FOR_REVISION") {
                chartDataMap[key].evaluation += 1;
            } else if (tx.status === "FOR_PROCESSING") {
                chartDataMap[key].processing += 1;
            } else if (tx.status === "RELEASED") {
                chartDataMap[key].released += 1;
            } else if (tx.status === "REJECTED") {
                chartDataMap[key].rejected += 1;
            }
        }
    });

    const chartData = Object.keys(chartDataMap)
        .sort()
        .map((key) => chartDataMap[key]);

    // Map dashboard chart statistics for payments dynamically based on date range
    const paymentDataMap: { [key: string]: { date: string; amount: number } } = {};
    const payCursor = new Date(payFromDate);
    let paySafetyCounter = 0;
    while (payCursor <= payToDate && paySafetyCounter < 400) {
        const dateStr = getPhilippineDisplayString(payCursor);
        const key = getPhilippineDateString(payCursor);
        paymentDataMap[key] = { date: dateStr, amount: 0 };
        payCursor.setDate(payCursor.getDate() + 1);
        paySafetyCounter++;
    }

    paymentsList.forEach((pay) => {
        const key = getPhilippineDateString(pay.createdAt);
        if (paymentDataMap[key]) {
            paymentDataMap[key].amount += pay.amount;
        }
    });

    const paymentChartData = Object.keys(paymentDataMap)
        .sort()
        .map((key) => paymentDataMap[key]);

    // Map dashboard chart statistics for residents dynamically based on date range
    const residentDataMap: { [key: string]: { date: string; count: number } } = {};
    const resCursor = new Date(resFromDate);
    let resSafetyCounter = 0;
    while (resCursor <= resToDate && resSafetyCounter < 400) {
        const dateStr = getPhilippineDisplayString(resCursor);
        const key = getPhilippineDateString(resCursor);
        residentDataMap[key] = { date: dateStr, count: 0 };
        resCursor.setDate(resCursor.getDate() + 1);
        resSafetyCounter++;
    }

    residentsList.forEach((res) => {
        const key = getPhilippineDateString(res.createdAt);
        if (residentDataMap[key]) {
            residentDataMap[key].count += 1;
        }
    });

    const residentChartData = Object.keys(residentDataMap)
        .sort()
        .map((key) => residentDataMap[key]);

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

            {/* Chart Section */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <TransactionDashboardView 
                    data={chartData} 
                    initialFrom={fromDate.toISOString().split("T")[0]}
                    initialTo={toDate.toISOString().split("T")[0]}
                    categories={categories}
                    activeCategory={selectedCategory}
                />
            </div>

            {/* Payment Revenue Chart Section */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <PaymentDashboardView 
                    data={paymentChartData}
                    initialFrom={payFromDate.toISOString().split("T")[0]}
                    initialTo={payToDate.toISOString().split("T")[0]}
                    categories={categories}
                    activeCategory={payCategory}
                    activeMethod={payMethod}
                />
            </div>

            {/* Resident Onboarding Chart Section */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <ResidentDashboardView 
                    data={residentChartData}
                    initialFrom={resFromDate.toISOString().split("T")[0]}
                    initialTo={resToDate.toISOString().split("T")[0]}
                    activeGender={resGender}
                    activeCivilStatus={resCivil}
                    activeSector={resSector}
                />
            </div>

            {/* Recent Announcements & Latest News Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <RecentAnnouncementsCard announcements={recentAnnouncements} />
                <LatestNewsCard news={latestNews} />
            </div>

            {/* Upcoming Events */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <UpcomingEventsCard events={upcomingEvents} pastEvents={pastEvents} />
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

