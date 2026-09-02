import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { CollectionsProvider } from "./components/CollectionsProvider";
import { CollectionsHeader } from "./components/CollectionsHeader";
import { CollectionsTable } from "./components/CollectionsTable";
import { IssueTicketModal } from "./components/IssueTicketModal";
import { TicketReceiptModal } from "./components/TicketReceiptModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Daily Ticket Collections | Treasury Hub",
    description: "Record daily market stall rental payments and issue municipal tickets.",
};

export default async function CollectionsPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();
    const userId = (session?.user as any)?.id;

    const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY_OFFICER", "ADMIN_AIDE", "MAYOR"];
    const allowedDepartments = ["TREASURY", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
    }

    const [collections, stalls, themeColor] = await Promise.all([
        (prisma as any).stallCollection.findMany({
            select: {
                id: true,
                stallId: true,
                vendorId: true,
                collectorId: true,
                collectedDate: true,
                ticketNumber: true,
                baseAmount: true,
                otherFeesPaid: true,
                overdueFeePaid: true,
                totalAmountPaid: true,
                paymentMethod: true,
                status: true,
                remarks: true,
                createdAt: true,
                updatedAt: true,
                stall: {
                    select: {
                        id: true,
                        stallNumber: true,
                        stallType: { select: { name: true } },
                    },
                },
                collector: { select: { id: true, name: true, email: true } },
                vendor: { select: { id: true, name: true, email: true } },
            },
            orderBy: { collectedDate: "desc" },
            take: 300,
        }),
        (prisma as any).stall.findMany({
            where: { status: "OCCUPIED" },
            select: {
                id: true,
                stallNumber: true,
                dailyRate: true,
                monthlyRate: true,
                dailyRateOverdueFee: true,
                stallType: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true, email: true } },
                otherFees: {
                    select: {
                        id: true,
                        name: true,
                        amount: true,
                        feeType: true,
                    },
                },
            },
            orderBy: { stallNumber: "asc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <CollectionsProvider
                initialCollections={collections as any}
                stalls={stalls as any}
                collectorId={userId}
                themeColor={themeColor}
            >
                <CollectionsHeader />
                <CollectionsTable />
                <IssueTicketModal />
                <TicketReceiptModal />
            </CollectionsProvider>
        </div>
    );
}
