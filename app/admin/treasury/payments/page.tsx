import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import PaymentsClient from "@/app/admin/treasury/payments/PaymentsClient";
import { getPaymentsLedger } from "@/app/admin/treasury/payments/actions";

export const metadata: Metadata = {
    title: "Payments Ledger | Mapandan Portal",
    description: "Official administrative ledger of municipal transactions and payment records.",
};

export default async function PaymentsPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        category?: string;
        method?: string;
        search?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "TREASURY_STAFF" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    const params = await props.searchParams;

    // Default filters
    const fromStr = params.from || undefined;
    const toStr = params.to || undefined;
    const category = params.category || "ALL";
    const method = params.method || "ALL";
    const search = params.search || "";
    const pageNum = params.page ? Number(params.page) : 1;
    const limitNum = params.limit ? Number(params.limit) : 10;

    // Get system setting theme_color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    // Initial fetch of payments to render on server load
    const ledgerRes = await getPaymentsLedger({
        from: fromStr,
        to: toStr,
        category,
        method,
        search,
        page: pageNum,
        limit: limitNum
    });

    const initialData = {
        payments: ledgerRes.data || [],
        totalCount: ledgerRes.totalCount || 0,
        totalPages: ledgerRes.totalPages || 0,
        currentPage: ledgerRes.currentPage || 1,
        stats: ledgerRes.stats || { totalPaid: 0, paidCount: 0 }
    };

    // Fetch categories dynamically
    const categoriesList = await prisma.transactionType.findMany({
        select: { category: true },
        distinct: ["category"]
    });
    const categories = categoriesList.map((c) => c.category).filter(Boolean);

    // Make dates safe for serialization by converting them to strings/dates safely
    const safeInitialData = JSON.parse(JSON.stringify(initialData));

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themeColor }} />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Payments <span className="tracking-normal italic" style={{ color: themeColor }}>Ledger</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Search, filter, and track all citizen payment transactions and reference numbers.
                </p>
            </div>

            <PaymentsClient 
                initialData={safeInitialData} 
                categories={categories}
                initialFrom={fromStr}
                initialTo={toStr}
                initialCategory={category}
                initialMethod={method}
                initialSearch={search}
            />
        </div>
    );
}
