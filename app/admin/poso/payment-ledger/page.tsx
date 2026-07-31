import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getPosoPaymentsLedger } from "@/app/admin/poso/payment-ledger/actions";
import PosoPaymentsClient from "./PosoPaymentsClient";

export const metadata: Metadata = {
    title: "POSO Payment Ledger | Mapandan Portal",
    description: "Official payment ledger for POSO traffic violation fines and citation settlements.",
};

export default async function PosoPaymentLedgerPage(props: {
    searchParams: Promise<{
        from?: string;
        to?: string;
        method?: string;
        search?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || (user.role !== "ADMIN" && user.role !== "POSO_OFFICER" && user.role !== "TREASURY_STAFF" && user.department !== "POSO")) {
        redirect("/admin/dashboard");
    }

    const params = await props.searchParams;

    const fromStr = params.from || undefined;
    const toStr = params.to || undefined;
    const method = params.method || "ALL";
    const search = params.search || "";
    const pageNum = params.page ? Number(params.page) : 1;
    const limitNum = params.limit ? Number(params.limit) : 10;

    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    const ledgerRes = await getPosoPaymentsLedger({
        from: fromStr,
        to: toStr,
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

    const safeInitialData = JSON.parse(JSON.stringify(initialData));

    return (
        <div className="p-4 md:p-8 space-y-8">
            <PosoPaymentsClient
                initialData={safeInitialData}
                themeColor={themeColor}
                initialFrom={fromStr}
                initialTo={toStr}
                initialMethod={method}
                initialSearch={search}
            />
        </div>
    );
}
