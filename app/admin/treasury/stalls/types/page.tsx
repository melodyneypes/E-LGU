import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { Metadata } from "next";

import { StallTypesProvider } from "./components/StallTypesProvider";
import { StallTypesHeader } from "./components/StallTypesHeader";
import { StallTypesMainView } from "./components/StallTypesMainView";
import { AddStallTypeModal } from "./components/AddStallTypeModal";
import { EditStallTypeModal } from "./components/EditStallTypeModal";
import { DeleteStallTypeModal } from "./components/DeleteStallTypeModal";
import { StallTypeDetailsModal } from "./components/StallTypeDetailsModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Market Sections & Types | Treasury Hub",
    description: "Manage public market sections, stall categories, and base specifications.",
};

export default async function StallTypesPage() {
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

    const [stallTypes, themeColor] = await Promise.all([
        (prisma as any).stallType.findMany({
            orderBy: { name: "asc" },
        }),
        getSystemSetting("theme_color", "#2563eb"),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors p-6 lg:p-8 space-y-8">
            <StallTypesProvider initialStallTypes={stallTypes as any} themeColor={themeColor}>
                <StallTypesHeader />
                <StallTypesMainView />
                <AddStallTypeModal />
                <EditStallTypeModal />
                <DeleteStallTypeModal />
                <StallTypeDetailsModal />
            </StallTypesProvider>
        </div>
    );
}
