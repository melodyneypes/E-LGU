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
    title: "Market Stalls Registry | Treasury Hub",
    description: "Manage municipal public market stalls, rates, and vendor assignments.",
};

export default async function StallsPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();

    const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY", "MAYOR"];
    const allowedDepartments = ["TREASURY", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
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
                stallType: { select: { id: true, code: true, name: true } },
                vendor: { select: { id: true, name: true, email: true } },
                otherFees: { select: { id: true, name: true, amount: true, feeType: true, remarks: true } },
            },
            orderBy: { stallNumber: "asc" },
        }),
        (prisma as any).stallType.findMany({
            select: { id: true, code: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
            where: { role: "VENDOR" as any },
            select: { id: true, name: true, email: true },
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
