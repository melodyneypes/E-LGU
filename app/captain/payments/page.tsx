import React from "react";
import prisma from "@/lib/db/prisma";
import { getSystemSetting } from "@/lib/settings";
import { CaptainPaymentsClient } from "./components/CaptainPaymentsClient";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { getCaptainPaymentsLedger } from "./actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CaptainPaymentsPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        method?: string;
        search?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "{{BARANGAY_NAME}}";
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

    const ledgerRes = await getCaptainPaymentsLedger({
        from: fromStr,
        to: toStr,
        category,
        method,
        search,
        page: 1,
        limit: 10,
        barangay: managedBarangay
    });

    const initialData = {
        payments: ledgerRes.payments || [],
        totalCount: ledgerRes.totalCount || 0,
        totalPages: ledgerRes.totalPages || 0,
        currentPage: ledgerRes.currentPage || 1,
        stats: ledgerRes.stats || { totalCount: 0, totalRevenue: 0, paidCount: 0, pendingCount: 0, avgPayment: 0 }
    };

    // Only get Level 0 service categories
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
                title="Barangay Collections & Revenue Ledger"
                subtitle={`Barangay ${managedBarangay} Level 0 Document & Certificate Official Payments`}
                iconName="credit-card"
            />

            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            Barangay Collections & Revenue Ledger
                        </h1>
                        <p className="text-xs font-semibold text-slate-400 italic">
                            Barangay {managedBarangay} Level 0 Document & Certificate Official Payments
                        </p>
                    </div>
                </div>

                <CaptainPaymentsClient
                    initialData={initialData}
                    categories={categories}
                    initialFrom={fromStr}
                    initialTo={toStr}
                    initialCategory={category}
                    initialMethod={method}
                    initialSearch={search}
                    managedBarangay={managedBarangay}
                />
            </main>
        </div>
    );
}
