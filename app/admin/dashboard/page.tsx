
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
import { BarangaySwitcher } from "../components/BarangaySwitcher";
import { redirect } from "next/navigation";
import { DashboardClientWrapper } from "./components/DashboardClientWrapper";
import { ConfigurableMetricCardsSection } from "./components/ConfigurableMetricCardsSection";
import { ConfigurableStrategicOpsSection } from "./components/ConfigurableStrategicOpsSection";
import { ConfigurableAnalyticsSection } from "./components/ConfigurableAnalyticsSection";
import { ConfigurableCommunitySection } from "./components/ConfigurableCommunitySection";

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

function formatTimeAgo(input: Date | string): string {
    if (!input) return "Just now";
    const dateObj = new Date(input);
    if (isNaN(dateObj.getTime())) return "Just now";

    let dateMs = dateObj.getTime();
    const nowMs = new Date().getTime();

    // If dateMs is in the future because database stored Philippine time string without offset, adjust by 8 hours
    if (dateMs > nowMs + 60000) {
        dateMs -= 8 * 60 * 60 * 1000;
    }

    const seconds = Math.floor((nowMs - dateMs) / 1000);

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
                    additionalData: true,
                    updatedAt: true,
                    type: { select: { name: true, category: true } },
                    user: { select: { name: true, department: true } },
                },
            }),
        ])
    ]);

    const [staffTickets, staffTx] = (staffLogsRaw || [[], []]) as [any[], any[]];
    const staffLogs = [
        ...staffTickets.map((t) => {
            const name = (t.officerName && !t.officerName.startsWith("c") && t.officerName.length < 24)
                ? t.officerName
                : "POSO Officer";
            return {
                id: `ticket-${t.id}`,
                userName: name,
                userRole: "POSO_OFFICER",
                department: "POSO",
                action: "issued citation ticket",
                module: "POSO Citation",
                details: `POSO Traffic Violation Citation for ${t.violatorName} (₱${t.totalAmount.toLocaleString()})`,
                time: formatTimeAgo(t.createdAt),
                createdAt: t.createdAt.toISOString(),
            };
        }),
        ...staffTx.map((tx) => {
            const addData = typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData || "{}") : tx.additionalData || {};
            let dept = tx.user?.department;
            if (!dept && addData.servingDepartment) {
                dept = addData.servingDepartment;
            }
            if (!dept && tx.processedBy) {
                const pLower = tx.processedBy.toLowerCase();
                if (pLower.includes("treasury")) dept = "Treasury";
                else if (pLower.includes("bplo") || pLower.includes("business")) dept = "BPLO";
                else if (pLower.includes("registrar") || pLower.includes("civil")) dept = "Civil Registry";
                else if (pLower.includes("poso")) dept = "POSO";
                else if (pLower.includes("engineer")) dept = "Engineering";
            }
            if (!dept) {
                dept = tx.type?.category || "LGU Staff";
            }

            const st = String(tx.status);
            const isApprovedOrPaid = st === "APPROVED" || st === "RELEASED" || st === "PAID" || st === "DELIVERED";
            const isRejected = st === "REJECTED";

            let staffName = tx.processedBy;
            if (!staffName || staffName.startsWith("cm") || staffName.length > 20) {
                staffName = addData.processedByStaff || addData.officerName || tx.user?.name || "Municipal Staff";
            }

            return {
                id: `tx-${tx.id}`,
                userName: staffName,
                userRole: "STAFF",
                department: String(dept).toUpperCase(),
                action: isApprovedOrPaid ? "processed payment / approved" : isRejected ? "rejected request for" : "updated status for",
                module: tx.type?.name || "Service Request",
                details: `${tx.type?.name || "Document"} for ${tx.user?.name || addData.violatorName || "Resident"}`,
                time: formatTimeAgo(tx.updatedAt),
                createdAt: tx.updatedAt.toISOString(),
            };
        }),
    ].sort((a, b) => {
        const getMs = (input: any) => {
            const dateObj = new Date(input);
            let ms = dateObj.getTime();
            if (isNaN(ms)) return 0;
            if (ms > Date.now() + 60000) ms -= 8 * 60 * 60 * 1000;
            return ms;
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
    });

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
        .sort((a, b) => {
            const getMs = (input: any) => {
                if (!input) return 0;
                const dateObj = new Date(input);
                let ms = dateObj.getTime();
                if (isNaN(ms)) return 0;
                if (ms > Date.now() + 60000) ms -= 8 * 60 * 60 * 1000;
                return ms;
            };
            return getMs(b.createdAt) - getMs(a.createdAt);
        }).slice(0, 7);

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <DashboardClientWrapper
                headerAction={
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            Executive Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                            Office of the Municipal Mayor — Jurisdiction: <span className="text-slate-900 dark:text-white font-bold">{selectedBarangay || "Municipality of Mapandan"}</span>
                        </p>
                    </div>
                }
                headerControls={
                    isAdmin ? (
                        <BarangaySwitcher
                            availableBarangays={activeBarangays.map(b => b.name)}
                            currentBarangay={selectedBarangay}
                            themeColor={themeColor}
                        />
                    ) : null
                }
            >
                {/* Configurable 4 Stat Cards Grid (Top Metric Section Only) */}
                <ConfigurableMetricCardsSection
                    residentsCount={residentsCount}
                    jobsCount={jobsCount}
                    reportsCount={reportsCount}
                    projectsCount={projectsCount}
                />

                {/* Strategic Operations (Administrative Services, Resident Activity, Staff Audit Logs Grid) */}
                <ConfigurableStrategicOpsSection
                    themeColor={themeColor}
                    activityLogs={activityLogs}
                    staffLogs={staffLogs}
                    selectedBarangay={selectedBarangay}
                />

                {/* Configurable Analytical Charts & Reports Section (Daily Requests, Collections Ledger, Resident Analytics, Citizen Reports Grid) */}
                <ConfigurableAnalyticsSection
                    chartData={chartData}
                    fromDate={fromDate}
                    toDate={toDate}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    themeColor={themeColor}
                    paymentChartData={paymentChartData}
                    payFromDate={payFromDate}
                    payToDate={payToDate}
                    payCategory={payCategory}
                    payMethod={payMethod}
                    residentChartData={residentChartData}
                    resFromDate={resFromDate}
                    resToDate={resToDate}
                    resGender={resGender}
                    resCivil={resCivil}
                    resSector={resSector}
                    recentReportsDetailed={recentReportsDetailed}
                />

                {/* Configurable Community Updates & Events Section (Announcements, News, Events, Projects Grid) */}
                <ConfigurableCommunitySection
                    announcements={recentAnnouncements}
                    news={latestNews}
                    events={upcomingEvents}
                    pastEvents={pastEvents}
                    projects={activeProjects}
                />
            </DashboardClientWrapper>
        </div>
    );
}

