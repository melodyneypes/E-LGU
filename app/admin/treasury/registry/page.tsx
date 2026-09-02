import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { RegistryProvider } from "./components/RegistryProvider";
import { RegistryHeader } from "./components/RegistryHeader";
import { RegistryTable } from "./components/RegistryTable";
import { AddPersonnelModal } from "./components/AddPersonnelModal";
import { EditPersonnelModal } from "./components/EditPersonnelModal";
import { DeletePersonnelModal } from "./components/DeletePersonnelModal";
import { PersonnelRFIDModal } from "./components/PersonnelRFIDModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Vendor & Collector Registry | Treasury Hub",
    description: "Manage registered market stall vendors and field ticket collectors.",
};

export default async function RegistryPage() {
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

    const [personnel, themeColor] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: {
                    in: ["VENDOR", "COLLECTOR"] as any,
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isEmailVerified: true,
                createdAt: true,
                rfid: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <RegistryProvider initialPersonnel={personnel as any} themeColor={themeColor}>
                <RegistryHeader />
                <RegistryTable />
                <AddPersonnelModal />
                <EditPersonnelModal />
                <DeletePersonnelModal />
                <PersonnelRFIDModal />
            </RegistryProvider>
        </div>
    );
}
