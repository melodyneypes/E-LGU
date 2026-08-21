import React from "react";
import prisma from "@/lib/db/prisma";
import { getSystemSetting } from "@/lib/settings";
import { CaptainDailyRequestsReportClient } from "./components/CaptainDailyRequestsReportClient";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { getCaptainTransactionReportData } from "./actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CaptainDailyRequestsReportPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        status?: string;
        search?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "Apaya";
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
    const reportRes = await getCaptainTransactionReportData({
        from: fromStr,
        to: toStr,
        category,
        status,
        search,
        page: 1,
        limit: 10,
        barangay: managedBarangay
    });

    const initialData = {
        transactions: reportRes.transactions || [],
        totalCount: reportRes.totalCount || 0,
        totalPages: reportRes.totalPages || 0,
        currentPage: reportRes.currentPage || 1,
        stats: reportRes.stats || { total: 0, pending: 0, released: 0, rejected: 0, revenue: 0 }
    };

    // Fetch categories dynamically (Level 0 services only)
    const categoriesList = await prisma.transactionType.findMany({
        where: { level: 0 },
        select: { category: true },
        distinct: ["category"]
    });
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Daily Service Requests Audit"
                subtitle={`Barangay ${managedBarangay} Level 0 Document & Certificate Requests`}
                iconName="file-text"
            />

            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            Daily Service Requests Audit
                        </h1>
                        <p className="text-xs font-semibold text-slate-400 italic">
                            Barangay {managedBarangay} Level 0 Document & Certificate Requests
                        </p>
                    </div>
                </div>

                <CaptainDailyRequestsReportClient 
                    initialData={initialData} 
                    categories={categories} 
                    themeColor={themeColor}
                    initialFrom={fromStr}
                    initialTo={toStr}
                    initialCategory={category}
                    initialStatus={status}
                    initialSearch={search}
                    managedBarangay={managedBarangay}
                />
            </main>
        </div>
    );
}
