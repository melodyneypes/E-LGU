import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

// Dedicated Captain Dashboard components
import { ConfigurableMetricCardsSection } from "./components/ConfigurableMetricCardsSection";
import { ConfigurableStrategicOpsSection } from "./components/ConfigurableStrategicOpsSection";
import { ConfigurableAnalyticsSection } from "./components/ConfigurableAnalyticsSection";
import { ConfigurableCommunitySection } from "./components/ConfigurableCommunitySection";
import { DashboardClientWrapper } from "./components/DashboardClientWrapper";

export const dynamic = "force-dynamic";

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

export default async function CaptainDashboardPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        payFrom?: string;
        payTo?: string;
        payCategory?: string;
        payMethod?: string;
        resFrom?: string;
        resTo?: string;
        resGender?: string;
        resCivil?: string;
        resSector?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session?.user) {
        redirect("/auth/login");
    }

    // Role check guard: Only BARANGAY_CAPTAIN role can access
    if (user?.role !== "BARANGAY_CAPTAIN") {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "";
    const selectedBarangay = managedBarangay;

    const params = await props.searchParams;
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

    const brgyFilter = selectedBarangay
        ? { equals: selectedBarangay, mode: "insensitive" as const }
        : undefined;

    const [
        settingsList,
        residentsCount,
        jobsCount,
        reportsCount,
        projectsCount,
        transactionsList,
        categoriesList,
        paymentsList,
        residentsList,
        recentAnnouncements,
        latestNews,
        upcomingEvents,
        pastEvents,
        activeProjects,
        recentResidents,
        recentReports,
        recentPayments,
        recentTransactions,
        staffLogsRaw
    ] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.resident.count({
            where: {
                registrationStatus: "APPROVED",
                category: { name: "Resident" },
                ...(brgyFilter ? { barangay: brgyFilter } : {})
            }
        }),
        prisma.job.count({ where: brgyFilter ? { barangay: brgyFilter } : {} }),
        prisma.report.count({ where: { status: "PENDING", ...(selectedBarangay ? { barangay: { name: { equals: selectedBarangay, mode: "insensitive" } } } : {}) } }),
        prisma.project.count({ where: brgyFilter ? { barangay: brgyFilter } : {} }),
        prisma.transaction.findMany({
            where: {
                createdAt: { gte: fromDate, lte: toDate },
                type: {
                    level: 0,
                    ...(selectedCategory && selectedCategory !== "ALL" ? { category: selectedCategory } : {})
                },
                ...(brgyFilter ? { user: { residentProfile: { barangay: brgyFilter } } } : {})
            },
            select: { createdAt: true, status: true }
        }),
        prisma.transactionType.findMany({
            where: { level: 0, isActive: true },
            select: { category: true },
            distinct: ["category"]
        }),
        prisma.payment.findMany({
            where: {
                status: "PAID",
                createdAt: { gte: payFromDate, lte: payToDate },
                transaction: {
                    type: {
                        level: 0,
                        ...(payCategory && payCategory !== "ALL" ? { category: payCategory } : {})
                    },
                    ...(brgyFilter ? { user: { residentProfile: { barangay: brgyFilter } } } : {})
                },
                ...(payMethod && payMethod !== "ALL" ? { method: payMethod as any } : {}),
            },
            select: {
                amount: true,
                createdAt: true,
                transaction: { select: { type: { select: { category: true, name: true } } } }
            }
        }),
        prisma.resident.findMany({
            where: {
                registrationStatus: "APPROVED",
                category: { name: "Resident" },
                createdAt: { gte: resFromDate, lte: resToDate },
                ...(brgyFilter ? { barangay: brgyFilter } : {}),
                ...(resGender && resGender !== "ALL" ? { gender: resGender } : {}),
                ...(resCivil && resCivil !== "ALL" ? { civilStatus: resCivil } : {}),
                ...(resSector === "SENIOR" ? { isSenior: true } : {}),
                ...(resSector === "PWD" ? { isPWD: true } : {}),
                ...(resSector === "SOLO_PARENT" ? { isSoloParent: true } : {}),
                ...(resSector === "FOUR_PS" ? { is4Ps: true } : {})
            },
            select: { createdAt: true }
        }),
        prisma.announcement.findMany({
            where: brgyFilter ? { barangay: brgyFilter } : {},
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, title: true, priority: true, category: true, isActive: true, createdAt: true }
        }),
        prisma.news.findMany({
            where: brgyFilter ? { barangay: brgyFilter } : {},
            orderBy: { publishDate: "desc" },
            take: 5,
            select: { id: true, title: true, author: true, category: true, imageUrl: true, isPublished: true, publishDate: true }
        }),
        prisma.event.findMany({
            where: { endDate: { gte: new Date() }, isPublished: true, ...(brgyFilter ? { barangay: brgyFilter } : {}) },
            orderBy: { startDate: "asc" },
            take: 5,
            select: { id: true, title: true, category: true, startDate: true, endDate: true, venueName: true, isPublished: true }
        }),
        prisma.event.findMany({
            where: { endDate: { lt: new Date() }, isPublished: true, ...(brgyFilter ? { barangay: brgyFilter } : {}) },
            orderBy: { endDate: "desc" },
            take: 5,
            select: { id: true, title: true, category: true, startDate: true, endDate: true, venueName: true, isPublished: true }
        }),
        prisma.project.findMany({
            where: { isPublished: true, ...(brgyFilter ? { barangay: brgyFilter } : {}) },
            orderBy: [{ status: "asc" }, { progress: "desc" }],
            take: 5,
            select: { id: true, title: true, category: true, status: true, location: true, progress: true }
        }),
        prisma.resident.findMany({
            where: {
                registrationStatus: "APPROVED",
                ...(brgyFilter ? { barangay: brgyFilter } : {})
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, firstName: true, lastName: true, createdAt: true }
        }),
        prisma.report.findMany({
            where: selectedBarangay ? {
                barangay: { name: { equals: selectedBarangay, mode: "insensitive" } }
            } : {},
            orderBy: { createdAt: "desc" },
            take: 5,
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
        prisma.payment.findMany({
            where: {
                status: "PAID",
                transaction: {
                    type: { level: 0 },
                    ...(brgyFilter ? { user: { residentProfile: { barangay: brgyFilter } } } : {})
                }
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, amount: true, method: true, createdAt: true,
                transaction: { select: { residentSnapshot: true, additionalData: true, user: { select: { name: true } } } }
            }
        }),
        prisma.transaction.findMany({
            where: {
                type: { level: 0 },
                ...(brgyFilter ? { user: { residentProfile: { barangay: brgyFilter } } } : {})
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, createdAt: true, residentSnapshot: true, additionalData: true,
                user: { select: { name: true } }, type: { select: { name: true } }
            }
        }),
        // 18. Barangay Staff Operations Audit (Resident reviews + Barangay transactions)
        Promise.all([
            prisma.resident.findMany({
                where: {
                    ...(brgyFilter ? { barangay: brgyFilter } : {}),
                    OR: [
                        { reviewedBy: { not: null } },
                        { receivedBy: { not: null } },
                    ],
                },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true, firstName: true, lastName: true, registrationStatus: true,
                    reviewedBy: true, reviewedAt: true, receivedBy: true, officialPosition: true, dateReceived: true, createdAt: true
                }
            }),
            prisma.transaction.findMany({
                where: {
                    processedBy: { not: null },
                    type: { level: 0 },
                    ...(brgyFilter ? { user: { residentProfile: { barangay: brgyFilter } } } : {})
                },
                orderBy: { updatedAt: "desc" },
                take: 5,
                select: {
                    id: true, status: true, processedBy: true, additionalData: true, updatedAt: true,
                    type: { select: { name: true, category: true } },
                    user: { select: { name: true } }
                }
            })
        ])
    ]);

    // Map chart data for daily requests
    const chartDataMap: { [key: string]: { date: string; requests: number; approved: number; rejected: number; pending: number } } = {};
    const cursor = new Date(fromDate);
    let safetyCounter = 0;
    while (cursor <= toDate && safetyCounter < 400) {
        const dateStr = getPhilippineDisplayString(cursor);
        const key = getPhilippineDateString(cursor);
        chartDataMap[key] = { date: dateStr, requests: 0, approved: 0, rejected: 0, pending: 0 };
        cursor.setDate(cursor.getDate() + 1);
        safetyCounter++;
    }

    transactionsList.forEach((tx) => {
        const key = getPhilippineDateString(tx.createdAt);
        if (chartDataMap[key]) {
            chartDataMap[key].requests += 1;
            const statusStr = String(tx.status);
            if (["APPROVED", "COMPLETED", "RELEASED", "PAID", "DELIVERED"].includes(statusStr)) {
                chartDataMap[key].approved += 1;
            } else if (statusStr === "REJECTED" || statusStr === "CANCELLED") {
                chartDataMap[key].rejected += 1;
            } else {
                chartDataMap[key].pending += 1;
            }
        }
    });

    const chartData = Object.keys(chartDataMap).sort().map((key) => chartDataMap[key]);

    // Map chart data for payments dynamically based on date range
    const paymentDataMap: { [key: string]: any } = {};
    const payCursor = new Date(payFromDate);
    let paySafetyCounter = 0;
    while (payCursor <= payToDate && paySafetyCounter < 400) {
        const dateStr = getPhilippineDisplayString(payCursor);
        const key = getPhilippineDateString(payCursor);
        const initialPoint: any = { date: dateStr, amount: 0 };
        categoriesList.forEach((c) => { if (c.category) initialPoint[c.category] = 0; });
        paymentDataMap[key] = initialPoint;
        payCursor.setDate(payCursor.getDate() + 1);
        paySafetyCounter++;
    }

    paymentsList.forEach((pay: any) => {
        const key = getPhilippineDateString(pay.createdAt);
        if (paymentDataMap[key]) {
            paymentDataMap[key].amount += pay.amount;
            const categoryName = pay.transaction?.type?.category || pay.transaction?.type?.name || "General Collection";
            paymentDataMap[key][categoryName] = (paymentDataMap[key][categoryName] || 0) + pay.amount;
        }
    });

    const paymentChartData = Object.keys(paymentDataMap).sort().map((key) => paymentDataMap[key]);

    // Map chart data for residents
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

    const residentChartData = Object.keys(residentDataMap).sort().map((key) => residentDataMap[key]);

    // Format Activity Logs
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
            try { resSnap = typeof tx?.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx?.residentSnapshot || {}; } catch { resSnap = {}; }
            try { addData = typeof tx?.additionalData === "string" ? JSON.parse(tx.additionalData) : tx?.additionalData || {}; } catch { addData = {}; }

            const name = tx?.user?.name || resSnap.fullName || resSnap.name || addData.violatorName || addData.fullName || addData.name || "A Resident";
            return {
                id: p.id,
                type: "payment" as const,
                user: name,
                action: "paid via",
                details: p.method,
                time: formatTimeAgo(p.createdAt),
                createdAt: p.createdAt
            };
        }),
        ...recentTransactions.map((t) => {
            let resSnap: any = {};
            let addData: any = {};
            try { resSnap = typeof t?.residentSnapshot === "string" ? JSON.parse(t.residentSnapshot) : t?.residentSnapshot || {}; } catch { resSnap = {}; }
            try { addData = typeof t?.additionalData === "string" ? JSON.parse(t.additionalData) : t?.additionalData || {}; } catch { addData = {}; }

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
    ].sort((a, b) => {
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

    // Batch-resolve processedBy CUIDs -> real staff names
    const [reviewedResidents, staffTx] = staffLogsRaw as [any[], any[]];
    const pbCuidIds: string[] = [
        ...new Set([
            ...reviewedResidents.map((r: any) => r.reviewedBy).filter((v: any): v is string => !!v && v.length > 20),
            ...staffTx.map((tx: any) => tx.processedBy).filter((v: any): v is string => !!v && v.length > 20),
        ]),
    ];

    const pbStaffUsers = pbCuidIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: pbCuidIds } },
            select: { id: true, name: true, role: true, department: true }
        })
        : [];
    const pbStaffMap = new Map<string, { name: string; role?: string | null; department?: string | null }>(
        pbStaffUsers.map((u) => [u.id, { name: u.name ?? "Barangay Official", role: u.role, department: u.department }])
    );

    const staffLogs = [
        ...reviewedResidents.map((res: any) => {
            const staffIdentifier = res.reviewedBy || res.receivedBy || "Barangay Admin";
            const staff = pbStaffMap.has(staffIdentifier)
                ? pbStaffMap.get(staffIdentifier)!
                : {
                    name: staffIdentifier,
                    role: res.officialPosition || (res.reviewedBy ? "Barangay Reviewer" : "Barangay Intake Officer"),
                    department: `Brgy. ${selectedBarangay}`,
                };

            const isApproved = res.registrationStatus === "APPROVED";
            const date = res.reviewedAt || res.dateReceived || res.createdAt;
            const actionText = res.reviewedBy
                ? (isApproved ? "approved" : "reviewed")
                : "received & encoded";

            return {
                id: `resident-review-${res.id}`,
                userName: staff.name,
                userRole: staff.role || "Barangay Staff",
                department: `Brgy. ${selectedBarangay}`,
                action: actionText,
                module: "Resident Verification",
                details: `${res.firstName} ${res.lastName}`,
                time: formatTimeAgo(date),
                createdAt: date ? new Date(date).toISOString() : new Date().toISOString()
            };
        }),
        ...staffTx.map((tx: any) => {
            const addData = typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData || "{}") : tx.additionalData || {};
            const processedById: string = tx.processedBy ?? "";
            let staffName = "Municipal Staff";
            let staffDept: string | null | undefined = null;

            if (processedById && pbStaffMap.has(processedById)) {
                const resolved = pbStaffMap.get(processedById)!;
                staffName = resolved.name;
                staffDept = resolved.department;
            } else if (processedById && processedById.length <= 20 && !/^c[a-z0-9]{20,}$/i.test(processedById)) {
                staffName = processedById;
            } else {
                staffName = addData.processedByStaff || addData.officerName || "Municipal Staff";
            }

            const dept = staffDept || addData.servingDepartment || tx.type?.category || "LGU Staff";
            const requesterName = (tx.user?.name || addData.violatorName || "Resident").split(" ")[0];
            const docName = tx.type?.name || "Service Document";

            return {
                id: `tx-${tx.id}`,
                userName: staffName,
                userRole: "Staff",
                department: dept,
                action: `processed ${String(tx.status).toLowerCase()}`,
                module: "Citizen Requests",
                details: `${docName} for ${requesterName} marked as ${tx.status}`,
                time: formatTimeAgo(tx.updatedAt),
                createdAt: tx.updatedAt ? new Date(tx.updatedAt).toISOString() : new Date().toISOString()
            };
        })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const settingsMap = settingsList as Map<string, string>;
    const themeColor = settingsMap.get("theme_color") || "#2563eb";
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    return (
        <DashboardClientWrapper
            themeColor={themeColor}
            session={session}
            managedBarangay={managedBarangay}
        >
            {/* 4 Stat Cards Grid */}
            <ConfigurableMetricCardsSection
                residentsCount={residentsCount}
                jobsCount={jobsCount}
                reportsCount={reportsCount}
                projectsCount={projectsCount}
            />

            {/* Strategic Operations Grid */}
            <ConfigurableStrategicOpsSection
                themeColor={themeColor}
                activityLogs={activityLogs}
                staffLogs={staffLogs}
                selectedBarangay={selectedBarangay}
            />

            {/* Analytical Charts & Reports Grid */}
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
                recentReportsDetailed={recentReports}
            />

            {/* Community & News Grid */}
            <ConfigurableCommunitySection
                announcements={recentAnnouncements}
                news={latestNews}
                events={upcomingEvents}
                pastEvents={pastEvents}
                projects={activeProjects}
            />
        </DashboardClientWrapper>
    );
}
