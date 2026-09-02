import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { CollectorProvider } from "./components/CollectorProvider";
import { CollectorHeader } from "./components/CollectorHeader";
import { CollectorTable } from "./components/CollectorTable";
import { AddCollectorModal } from "./components/AddCollectorModal";
import { EditCollectorModal } from "./components/EditCollectorModal";
import { DeleteCollectorModal } from "./components/DeleteCollectorModal";
import { CollectorRFIDModal } from "./components/CollectorRFIDModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Field Collector Registry | Treasury Hub",
    description: "Manage municipal field ticket collectors and RFID badge credentials.",
};

export default async function CollectorRegistryPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();

    const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY_OFFICER", "ADMIN_AIDE", "MAYOR"];
    const allowedDepartments = ["TREASURY", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
    }

    const [collectors, themeColor] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: "COLLECTOR" as any,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rfid: true,
                isEmailVerified: true,
                createdAt: true,
                _count: {
                    select: {
                        collectorCollections: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <CollectorProvider initialCollectors={collectors as any} themeColor={themeColor}>
                <CollectorHeader />
                <CollectorTable />
                <AddCollectorModal />
                <EditCollectorModal />
                <DeleteCollectorModal />
                <CollectorRFIDModal />
            </CollectorProvider>
        </div>
    );
}
