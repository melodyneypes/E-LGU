import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { StallsProvider } from "./components/StallsProvider";
import { StallsHeader } from "./components/StallsHeader";
import { AddStallModal } from "./components/AddStallModal";
import { EditStallModal } from "./components/EditStallModal";
import { StallDetailsModal } from "./components/StallDetailsModal";
import { DeleteStallModal } from "./components/DeleteStallModal";

import { StallsMainView } from "./components/StallsMainView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Market Stall Registration | BPLO Hub",
    description: "Manage municipal public market stalls, rates, and vendor registrations.",
};

export default async function StallsPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();

    // Only BPLO, Admin, Admin Aide, and Mayor are authorized. Treasury is blocked.
    const allowedRoles = ["ADMIN", "ADMIN_AIDE", "BPLO", "BPLO_STAFF", "BPLO_OFFICER", "MAYOR"];
    const allowedDepartments = ["BPLO", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);
    const isTreasury = userRole === "TREASURY_STAFF" || userRole === "TREASURY_OFFICER" || userDepartment === "TREASURY";

    if (!session || !isAllowedRole || !isAllowedDepartment || isTreasury) {
        redirect("/admin/dashboard");
    }

    const [stalls, stallTypes, vendors, themeColor] = await Promise.all([
        (prisma as any).stall.findMany({
            select: {
                id: true,
                stallNumber: true,
                stallTypeId: true,
                vendorId: true,
                status: true,
                dailyRate: true,
                monthlyRate: true,
                dailyRateOverdueFee: true,
                monthlyRateOverdueFee: true,
                latitude: true,
                longitude: true,
                address: true,
                stallType: { select: { id: true, code: true, name: true } },
                vendor: { select: { id: true, name: true, email: true } },
                otherFees: { select: { id: true, name: true, amount: true, feeType: true, remarks: true } },
            },
            orderBy: { createdAt: "asc" },
        }),
        (prisma as any).stallType.findMany({
            select: { id: true, code: true, name: true, isActive: true },
            orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
            where: {
                role: "VENDOR" as any,
                isActive: true,
            },
            select: { id: true, name: true, email: true, isActive: true },
            orderBy: { name: "asc" },
            take: 300,
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <StallsProvider
                initialStalls={stalls as any}
                stallTypes={stallTypes}
                vendors={vendors}
                themeColor={themeColor}
            >
                <StallsHeader />

                {/* View Container */}
                <StallsMainView />

                {/* Modals */}
                <AddStallModal />
                <EditStallModal />
                <StallDetailsModal />
                <DeleteStallModal />
            </StallsProvider>
        </div>
    );
}
