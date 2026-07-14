import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CedulaSettingsClient } from "./CedulaSettingsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

// Cedula Global Calculator settings route
export default async function CedulaSettingsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || user.role !== "ADMIN" || user.department?.toUpperCase() !== "LGU") {
        redirect("/admin/dashboard");
    }

    // Retrieve calculator settings
    const settingsList = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    "cedula_basic_tax_individual",
                    "cedula_basic_tax_juridical",
                    "cedula_additional_tax_rate_individual",
                    "cedula_additional_tax_rate_juridical",
                    "cedula_cap_individual",
                    "cedula_cap_juridical",
                    "cedula_penalty_rate_monthly"
                ]
            }
        }
    });

    const settingsMap: Record<string, string> = {};
    settingsList.forEach(s => {
        settingsMap[s.key] = s.value;
    });

    // Provide baseline fallback defaults (all formatted nicely)
    const defaults = {
        cedula_basic_tax_individual: "5.00",
        cedula_basic_tax_juridical: "500.00",
        cedula_additional_tax_rate_individual: "1.00", // Peso amount per 1,000
        cedula_additional_tax_rate_juridical: "2.00",  // Peso amount per 5,000
        cedula_cap_individual: "5000.00",
        cedula_cap_juridical: "10000.00",
        cedula_penalty_rate_monthly: "0.02" // 2%
    };

    const finalSettings = { ...defaults, ...settingsMap };

    // Get theme color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    return (
        <div className="p-8">
            <Suspense fallback={<div>Loading Cedula Settings...</div>}>
                <CedulaSettingsClient initialSettings={finalSettings} themeColor={themeColor} />
            </Suspense>
        </div>
    );
}
