import React from "react";
import prisma from "@/lib/db/prisma";
import { getSystemSetting } from "@/lib/settings";
import { DailyRequestsReportClient } from "./components/DailyRequestsReportClient";
import { getTransactionReportData } from "@/app/admin/actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DailyRequestsReportPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        status?: string;
        search?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "BARANGAY_ADMIN")) {
        redirect("/login");
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

    // Fetch initial page of reports matching parameters
    const reportRes = await getTransactionReportData({
        from: fromStr,
        to: toStr,
        category,
        status,
        search,
        page: 1,
        limit: 10
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

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <DailyRequestsReportClient 
            initialData={initialData} 
            categories={categories} 
            themeColor={themeColor}
            initialFrom={fromStr}
            initialTo={toStr}
            initialCategory={category}
            initialStatus={status}
            initialSearch={search}
        />
    );
}

