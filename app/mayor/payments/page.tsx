import React from "react";
import prisma from "@/lib/db/prisma";
import { getSystemSetting } from "@/lib/settings";
import { MayorPaymentsClient } from "./components/MayorPaymentsClient";
import { MayorReportsHeader } from "../reports/components/MayorReportsHeader";
import { getMayorPaymentsLedger } from "./actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MayorPaymentsPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        method?: string;
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

    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const defaultFromStr = defaultFromDate.toISOString().split("T")[0];
    const defaultToStr = new Date().toISOString().split("T")[0];

    const fromStr = params.from || defaultFromStr;
    const toStr = params.to || defaultToStr;
    const category = params.category || "ALL";
    const method = params.method || "ALL";
    const search = params.search || "";
    const barangay = params.barangay || "ALL";

    const ledgerRes = await getMayorPaymentsLedger({
        from: fromStr,
        to: toStr,
        category,
        method,
        search,
        page: 1,
        limit: 10,
        barangay
    });

    const initialData = {
        payments: ledgerRes.payments || [],
        totalCount: ledgerRes.totalCount || 0,
        totalPages: ledgerRes.totalPages || 0,
        currentPage: ledgerRes.currentPage || 1,
        stats: ledgerRes.stats || { totalCount: 0, totalRevenue: 0, paidCount: 0, pendingCount: 0, avgPayment: 0 }
    };

    const categoriesList = await prisma.transactionType.findMany({
        select: { category: true },
        distinct: ["category"]
    });
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    const barangaysList = await prisma.barangayInfo.findMany({
        select: { name: true },
        orderBy: { name: "asc" }
    });
    const barangays = barangaysList.map((b) => b.name);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors">
            <MayorReportsHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={barangays}
                selectedBarangay={barangay}
                title="Municipal Payments Oversight"
                subtitle="Executive Revenue & Transaction Payment Audit Logs"
                badge="Executive Audit"
                iconName="file-text"
                hideBarangaySwitcher={true}
            />
            <MayorPaymentsClient
                initialData={initialData}
                categories={categories}
                themeColor={themeColor}
                initialFrom={fromStr}
                initialTo={toStr}
                initialCategory={category}
                initialMethod={method}
                initialSearch={search}
                initialBarangay={barangay}
            />
        </div>
    );
}
