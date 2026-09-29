import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { VendorProvider } from "./components/VendorProvider";
import { VendorHeader } from "./components/VendorHeader";
import { VendorTable } from "./components/VendorTable";
import { AddVendorModal } from "./components/AddVendorModal";
import { EditVendorModal } from "./components/EditVendorModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Market Vendor Registry | BPLO Hub",
    description: "Manage registered market stall vendors and occupants.",
};

export default async function VendorRegistryPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();

    const allowedRoles = ["ADMIN", "BPLO", "BPLO_STAFF", "BPLO_OFFICER", "ADMIN_AIDE", "MAYOR"];
    const allowedDepartments = ["BPLO", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
    }

    const [vendors, themeColor] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: "VENDOR" as any,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isEmailVerified: true,
                isActive: true,
                createdAt: true,
                vendorStalls: {
                    select: {
                        id: true,
                        stallNumber: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <VendorProvider initialVendors={vendors as any} themeColor={themeColor}>
                <VendorHeader />
                <VendorTable />
                <AddVendorModal />
                <EditVendorModal />
            </VendorProvider>
        </div>
    );
}
