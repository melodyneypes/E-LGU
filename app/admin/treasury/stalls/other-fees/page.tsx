import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { OtherFeesProvider } from "./components/OtherFeesProvider";
import { OtherFeesHeader } from "./components/OtherFeesHeader";
import { OtherFeesMainView } from "./components/OtherFeesMainView";
import { AddOtherFeeModal } from "./components/AddOtherFeeModal";
import { EditOtherFeeModal } from "./components/EditOtherFeeModal";
import { AssignFeeModal } from "./components/AssignFeeModal";
import { OtherFeeDetailsModal } from "./components/OtherFeeDetailsModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Other Market Fees | Treasury Hub",
    description: "Manage utility, sanitation, and custom recurring municipal market fees.",
};

export default async function OtherFeesPage() {
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

    const [otherFees, allStalls, themeColor] = await Promise.all([
        (prisma as any).otherFee.findMany({
            include: {
                _count: { select: { stalls: true } },
                stalls: {
                    include: {
                        stall: { select: { id: true, stallNumber: true, status: true } },
                    },
                },
            },
            orderBy: { name: "asc" },
        }),
        (prisma as any).stall.findMany({
            select: { id: true, stallNumber: true, status: true },
            orderBy: { stallNumber: "asc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <OtherFeesProvider
                initialOtherFees={otherFees as any}
                allStalls={allStalls as any}
                themeColor={themeColor}
            >
                <OtherFeesHeader />
                <OtherFeesMainView />
                <AddOtherFeeModal />
                <EditOtherFeeModal />
                <AssignFeeModal />
                <OtherFeeDetailsModal />
            </OtherFeesProvider>
        </div>
    );
}
