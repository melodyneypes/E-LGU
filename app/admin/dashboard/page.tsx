
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
import { BarangaySwitcher } from "../components/BarangaySwitcher";
import { Users, Briefcase, AlertTriangle, Hammer, Utensils, Hotel, Image, Flag, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TransactionDashboardView } from "./components/TransactionDashboardView";
import { PaymentDashboardView } from "./components/PaymentDashboardView";
import { ResidentDashboardView } from "./components/ResidentDashboardView";
import { RecentAnnouncementsCard } from "./components/RecentAnnouncementsCard";
import { LatestNewsCard } from "./components/LatestNewsCard";
import { UpcomingEventsCard } from "./components/UpcomingEventsCard";
import { LGUProjectsCard } from "./components/LGUProjectsCard";
import { ActivityLogsCard } from "./components/ActivityLogsCard";
import { StaffActivityLogsCard } from "./components/StaffActivityLogsCard";
import { ReportsOverviewCard } from "./components/ReportsOverviewCard";
import { DashboardClientWrapper } from "./components/DashboardClientWrapper";

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

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
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

    // Redirect Content Admin directly to announcements hub
    if (user?.role === "CONTENT_ADMIN") {
        redirect("/admin/announcements");
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

    const [settings, residentsCount, jobsCount, reportsCount, projectsCount, activeBarangays, transactionsList, categoriesList, paymentsList, residentsList, recentAnnouncements, latestNews, upcomingEvents, pastEvents, activeProjects, recentResidents, recentReports, recentPayments, recentTransactions, , , , , , , , recentReportsDetailed, staffLogsRaw] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.resident.count({
            where: {
                registrationStatus: "APPROVED",
                category: {
                    name: "Resident"
                },
                ...(selectedBarangay ? { barangay: selectedBarangay } : {})
            }
        }),
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
            where: selectedBarangay ? { barangay: selectedBarangay } : {},
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
            where: selectedBarangay ? { barangay: selectedBarangay } : {},
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
                isPublished: true,
                ...(selectedBarangay ? { barangay: selectedBarangay } : {})
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
                isPublished: true,
                ...(selectedBarangay ? { barangay: selectedBarangay } : {})
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
        }),
        prisma.project.findMany({
            where: {
                isPublished: true,
                ...(selectedBarangay ? { barangay: selectedBarangay } : {})
            },
            orderBy: [{ status: "asc" }, { progress: "desc" }],
            take: 5,
            select: {
                id: true,
                title: true,
                category: true,
                status: true,
                location: true,
                progress: true
            }
        }),
        prisma.resident.findMany({
            where: {
                registrationStatus: "APPROVED",
                ...(selectedBarangay ? { barangay: selectedBarangay } : {})
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        }),
        prisma.report.findMany({
            where: selectedBarangay ? { barangay: { name: selectedBarangay } } : {},
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                category: true,
                createdAt: true,
                user: { select: { name: true } }
            }
        }),
        prisma.payment.findMany({
            where: {
                status: "PAID",
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
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                amount: true,
                method: true,
                createdAt: true,
                transaction: {
                    select: {
                        user: { select: { name: true } },
                        residentSnapshot: true,
                        additionalData: true,
                    }
                }
            }
        }),
        prisma.transaction.findMany({
            where: selectedBarangay ? {
                user: {
                    residentProfile: {
                        barangay: selectedBarangay
                    }
                }
            } : {},
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                createdAt: true,
                residentSnapshot: true,
                additionalData: true,
                type: { select: { name: true } },
                user: { select: { name: true } }
            }
        }),
        // Report stats: counts by status
        prisma.report.count({ where: selectedBarangay ? { barangay: { name: selectedBarangay } } : {} }),
        prisma.report.count({ where: { status: "PENDING", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        prisma.report.count({ where: { status: "SEEN", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        prisma.report.count({ where: { status: "IN_PROGRESS", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        prisma.report.count({ where: { status: "COMPLETED", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        prisma.report.count({ where: { status: "REJECTED", ...(selectedBarangay ? { barangay: { name: selectedBarangay } } : {}) } }),
        // Report top categories
        prisma.report.groupBy({
            by: ["category"],
            _count: { _all: true },
            where: selectedBarangay ? { barangay: { name: selectedBarangay } } : {},
            orderBy: { _count: { category: "desc" } },
            take: 7
        }),
        // Detailed recent reports for feed
        prisma.report.findMany({
            where: selectedBarangay ? { barangay: { name: selectedBarangay } } : {},
            orderBy: { createdAt: "desc" },
            take: 7,
            select: {
                id: true,
                category: true,
                status: true,
                description: true,
                createdAt: true,
                user: { select: { name: true } },
                barangay: { select: { name: true } }
            }
        }),
        // Staff & Enforcer Operational Activity Logs (Query-Based)
        Promise.all([
            prisma.ticketHeader.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    ticketNo: true,
                    officerName: true,
                    badgeNo: true,
                    violatorName: true,
                    totalAmount: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma.transaction.findMany({
                where: { processedBy: { not: null } },
                orderBy: { updatedAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    status: true,
                    processedBy: true,
                    updatedAt: true,
                    type: { select: { name: true, category: true } },
                    user: { select: { name: true } },
                },
            }),
        ])
    ]);

    const [staffTickets, staffTx] = (staffLogsRaw || [[], []]) as [any[], any[]];
    const staffLogs = [
        ...staffTickets.map((t) => {
            const sec = Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / 1000);
            const timeAgo = sec < 60 ? "Just now" : sec < 3600 ? `${Math.floor(sec / 60)} mins ago` : sec < 86400 ? `${Math.floor(sec / 3600)} hrs ago` : `${Math.floor(sec / 86400)} days ago`;
            return {
                id: `ticket-${t.id}`,
                userName: t.officerName || "POSO Enforcer",
                userRole: "POSO_OFFICER",
                department: "POSO",
                action: "issued citation ticket",
                module: "POSO Citation",
                details: `#${t.ticketNo} to ${t.violatorName} (₱${t.totalAmount.toLocaleString()})`,
                time: timeAgo,
                createdAt: t.createdAt.toISOString(),
            };
        }),
        ...staffTx.map((tx) => {
            const sec = Math.floor((new Date().getTime() - new Date(tx.updatedAt).getTime()) / 1000);
            const timeAgo = sec < 60 ? "Just now" : sec < 3600 ? `${Math.floor(sec / 60)} mins ago` : sec < 86400 ? `${Math.floor(sec / 3600)} hrs ago` : `${Math.floor(sec / 86400)} days ago`;
            return {
                id: `tx-${tx.id}`,
                userName: tx.processedBy || "Municipal Staff",
                userRole: "STAFF",
                department: tx.type?.category || "LGU Staff",
                action: tx.status === "APPROVED" || tx.status === "RELEASED" ? "approved & processed" : tx.status === "REJECTED" ? "rejected request for" : "updated status for",
                module: tx.type?.name || "Service Request",
                details: `${tx.type?.name || "Document"} for ${tx.user?.name || "Resident"}`,
                time: timeAgo,
                createdAt: tx.updatedAt.toISOString(),
            };
        }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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



    // Combine and sort real-time activities chronologically
    const activityLogs = [
        ...recentResidents.map((r) => ({
            id: r.id,
            type: "resident" as const,
            user: `${r.firstName} ${r.lastName}`,
            action: "registered as a new",
            details: "Resident Profile",
            time: formatTimeAgo(r.createdAt),
            createdAt: r.createdAt
        })),
        ...recentReports.map((rp) => ({
            id: rp.id,
            type: "report" as const,
            user: rp.user?.name || "A Resident",
            action: "filed a public report on",
            details: rp.category,
            time: formatTimeAgo(rp.createdAt),
            createdAt: rp.createdAt
        })),
        ...recentPayments.map((p) => {
            const tx = p.transaction;
            let resSnap: any = {};
            let addData: any = {};
            try {
                resSnap = typeof tx?.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx?.residentSnapshot || {};
            } catch { resSnap = {}; }
            try {
                addData = typeof tx?.additionalData === "string" ? JSON.parse(tx.additionalData) : tx?.additionalData || {};
            } catch { addData = {}; }

            const name = tx?.user?.name || resSnap.fullName || resSnap.name || addData.violatorName || addData.fullName || addData.name || "A Resident";
            return {
                id: p.id,
                type: "payment" as const,
                user: name,
                action: `paid ₱${p.amount.toLocaleString()} via`,
                details: p.method,
                time: formatTimeAgo(p.createdAt),
                createdAt: p.createdAt
            };
        }),
        ...recentTransactions.map((t) => {
            let resSnap: any = {};
            let addData: any = {};
            try {
                resSnap = typeof t?.residentSnapshot === "string" ? JSON.parse(t.residentSnapshot) : t?.residentSnapshot || {};
            } catch { resSnap = {}; }
            try {
                addData = typeof t?.additionalData === "string" ? JSON.parse(t.additionalData) : t?.additionalData || {};
            } catch { addData = {}; }

            const name = t.user?.name || resSnap.fullName || resSnap.name || addData.violatorName || addData.fullName || addData.name || "A Resident";
            return {
                id: t.id,
                type: "transaction" as const,
                user: name,
                action: "requested service for",
                details: t.type?.name || "Certificate",
                time: formatTimeAgo(t.createdAt),
                createdAt: t.createdAt
            };
        })
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 7);

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040]">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Municipal Overview
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Welcome, Municipal Admin. Viewing data for <span className="text-slate-900 dark:text-white font-bold">{selectedBarangay || "Mapandan"}</span>.
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
                </div>
            </div>

            <DashboardClientWrapper>
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Residents Card */}
                    <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                        <div className="absolute -top-4 -right-4 text-blue-100 dark:text-blue-500/10 transition-transform group-hover:scale-110">
                            <Users size={120} strokeWidth={1} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Residents</p>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{residentsCount.toLocaleString()}</h2>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-600 italic">
                            <span className="bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-full">Registered Registry</span>
                        </div>
                    </div>

                    {/* Jobs Card */}
                    <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                        <div className="absolute -top-4 -right-4 text-emerald-100 dark:text-emerald-500/10 transition-transform group-hover:scale-110">
                            <Briefcase size={120} strokeWidth={1} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Jobs Posted</p>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{jobsCount.toLocaleString()}</h2>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 italic">
                            <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">Available Openings</span>
                        </div>
                    </div>

                    {/* Reports Card */}
                    <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                        <div className="absolute -top-4 -right-4 text-orange-100 dark:text-orange-500/10 transition-transform group-hover:scale-110">
                            <AlertTriangle size={120} strokeWidth={1} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Pending Reports</p>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{reportsCount.toLocaleString()}</h2>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-orange-600 italic">
                            <span className="bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-full">Needs Response</span>
                        </div>
                    </div>

                    {/* Projects Card */}
                    <div className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1">
                        <div className="absolute -top-4 -right-4 text-purple-100 dark:text-purple-500/10 transition-transform group-hover:scale-110">
                            <Hammer size={120} strokeWidth={1} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">LGU Projects</p>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4">{projectsCount.toLocaleString()}</h2>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-purple-600 italic">
                            <span className="bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-full">Infrastructure Works</span>
                        </div>
                    </div>
                </div>

                {/* Strategic Operations & Activity Logs 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {/* Quick Actions (Col-span 1: Executive View) */}
                    <div className="space-y-4 flex flex-col h-full">
                        <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Administrative Services</h3>
                        <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-[#2a3040] flex-1 flex flex-col justify-between p-2">
                            {[
                                { title: "Kainan Hub", desc: "Manage local dining & culinary spots.", icon: Utensils, color: "orange", action: "Manage", path: "/admin/dining" },
                                { title: "Tuluyan Hub", desc: "Lodging & accommodation records.", icon: Hotel, color: "blue", action: "Manage", path: "/admin/accommodation" },
                                { title: "Tourism Gallery", desc: "Showcase spots & gallery highlights.", icon: Image, color: "emerald", action: "Manage", path: "/admin/tourism" },
                                { title: "Incident Reports", desc: "Monitor & review public incident files.", icon: Flag, color: "rose", action: "Review", path: "/admin/reports" },
                                { title: "Emergency Hotlines", desc: "Update critical emergency list.", icon: Phone, color: "purple", action: "Manage", path: "/admin/hotlines" }
                            ].map((item, idx) => (
                                <Link
                                    key={idx}
                                    href={item.path}
                                    className="px-5 py-4 flex-1 flex items-center justify-between transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 cursor-pointer rounded-2xl group"
                                >
                                    <div className="flex items-center space-x-4 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl bg-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-50 dark:bg-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-500/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                                            <item.icon className={`w-6 h-6 text-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-600`} />
                                        </div>
                                        <div className="min-w-0 space-y-0.5">
                                            <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight uppercase italic truncate">{item.title}</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic truncate">{item.desc}</p>
                                        </div>
                                    </div>
                                    <span
                                        className="text-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase italic transition-all shadow-md hover:shadow-lg active:scale-95 text-white shrink-0 ml-3"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        {item.action}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Resident Activity Logs (Col-span 1) */}
                    <div className="space-y-4 flex flex-col">
                        <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Resident Activity</h3>
                        <div className="flex-1">
                            <ActivityLogsCard logs={activityLogs} selectedBarangay={selectedBarangay} />
                        </div>
                    </div>

                    {/* Staff Audit Logs (Col-span 1) */}
                    <div className="space-y-4 flex flex-col">
                        <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Staff Audit Logs</h3>
                        <div className="flex-1">
                            <StaffActivityLogsCard initialLogs={staffLogs} />
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
                        themeColor={themeColor}
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

                {/* Citizen Reports Overview Section */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <ReportsOverviewCard
                        initialReports={recentReportsDetailed.map((r: { id: string; category: string; status: string; description: string; createdAt: Date; user: { name: string | null } | null; barangay: { name: string } | null }) => ({
                            ...r,
                            createdAt: r.createdAt.toISOString()
                        }))}
                    />
                </div>

                {/* Recent Announcements & Latest News Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <RecentAnnouncementsCard announcements={recentAnnouncements} />
                    <LatestNewsCard news={latestNews} />
                </div>

                {/* Upcoming Events & LGU Projects Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <UpcomingEventsCard events={upcomingEvents} pastEvents={pastEvents} />
                    <LGUProjectsCard projects={activeProjects} />
                </div>


            </DashboardClientWrapper>
        </div>
    );
}

