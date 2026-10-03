import React from "react";
import prisma from "@/lib/db/prisma";
import { getSystemSetting } from "@/lib/settings";
import { MayorDailyRequestsReportClient } from "./components/MayorDailyRequestsReportClient";
import { MayorReportsHeader } from "../components/MayorReportsHeader";
import { getMayorTransactionReportData } from "./actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MayorDailyRequestsReportPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        status?: string;
        search?: string;
        barangay?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "MAYOR" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const params = await props.searchParams;

    // Parse filters with defaults
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const defaultFromStr = defaultFromDate.toISOString().split("T")[0];
    const defaultToStr = new Date().toISOString().split("T")[0];

    const fromStr = params.from || defaultFromStr;
    const toStr = params.to || defaultToStr;
    const category = params.category || "ALL";
    const status = params.status || "ALL";
    const search = params.search || "";
    const barangay = params.barangay || "ALL";

    // Fetch initial page of reports matching parameters
    const reportRes = await getMayorTransactionReportData({
        from: fromStr,
        to: toStr,
        category,
        status,
        search,
        page: 1,
        limit: 10,
        barangay
    });

    const initialData = {
        transactions: reportRes.transactions || [],
        totalCount: reportRes.totalCount || 0,
        totalPages: reportRes.totalPages || 0,
        currentPage: reportRes.currentPage || 1,
        stats: reportRes.stats || { total: 0, pending: 0, released: 0, rejected: 0, revenue: 0 }
    };

    // Fetch categories dynamically
    const categoriesList = await prisma.transactionType.findMany({
        select: { category: true },
        distinct: ["category"]
    });
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    // Fetch barangays list dynamically
    const barangaysList = await prisma.barangayInfo.findMany({
        select: { name: true },
        orderBy: { name: "asc" }
    });
    const barangays = barangaysList.map(b => b.name);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors">
            <MayorReportsHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={barangays}
                selectedBarangay={barangay}
                title="Daily Requests Oversight"
                subtitle="E-LGU Executive Audit & Service Logs"
                badge="Executive Audit"
                iconName="file-text"
            />
            <MayorDailyRequestsReportClient 
                initialData={initialData} 
                categories={categories} 
                themeColor={themeColor}
                initialFrom={fromStr}
                initialTo={toStr}
                initialCategory={category}
                initialStatus={status}
                initialSearch={search}
                initialBarangay={barangay}
            />
        </div>
    );
}
