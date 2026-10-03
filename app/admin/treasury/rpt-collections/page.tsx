import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import RptCollectionsClient from "./RptCollectionsClient";
import { getRptCollectionsLedger } from "./actions";

export const metadata: Metadata = {
    title: "RPT Collections & Reports | E-LGU Portal",
    description: "Official administrative ledger and Form 10(A) abstract reports for Real Property Tax collections.",
};

export default async function RptCollectionsPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        rptType?: string;
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

    const fromStr = params.from || undefined;
    const toStr = params.to || undefined;
    const rptType = params.rptType || "ALL";
    const method = params.method || "ALL";
    const search = params.search || "";
    const pageNum = params.page ? Number(params.page) : 1;
    const limitNum = params.limit ? Number(params.limit) : 10;

    // Get system setting theme_color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    // Initial fetch of RPT payments for fast initial render
    const ledgerRes = await getRptCollectionsLedger({
        from: fromStr,
        to: toStr,
        rptType,
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
        stats: ledgerRes.stats || { totalPaid: 0, paidCount: 0, cat1Count: 0, cat2Count: 0, cat3Count: 0 }
    };

    const safeInitialData = JSON.parse(JSON.stringify(initialData));
    const currentUserName = session?.user?.name || "";

    return (
        <div className="p-4 md:p-8 space-y-8">
            <RptCollectionsClient
                initialData={safeInitialData}
                themeColor={themeColor}
                currentUserName={currentUserName}
                initialFrom={fromStr}
                initialTo={toStr}
                initialRptType={rptType}
                initialMethod={method}
                initialSearch={search}
            />
        </div>
    );
}
