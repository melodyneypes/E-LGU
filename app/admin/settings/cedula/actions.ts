"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveCedulaSettingsAction(settings: Record<string, string>) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || user.role !== "ADMIN" || user.department?.toUpperCase() !== "LGU") {
            return { success: false, error: "Unauthorized" };
        }

        const allowedKeys = [
            "cedula_basic_tax_individual",
            "cedula_basic_tax_juridical",
            "cedula_additional_tax_rate_individual",
            "cedula_additional_tax_rate_juridical",
            "cedula_cap_individual",
            "cedula_cap_juridical",
            "cedula_penalty_rate_monthly"
        ];

        // Perform upserts in a database transaction
        await prisma.$transaction(
            Object.entries(settings).map(([key, value]) => {
                if (!allowedKeys.includes(key)) {
                    throw new Error(`Invalid setting key: ${key}`);
                }
                return prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: String(value).trim() },
                    create: {
                        key,
                        value: String(value).trim(),
                        description: `Cedula Calculator parameter: ${key}`
                    }
                });
            })
        );

        revalidatePath("/admin/settings/cedula");
        revalidatePath("/user/services/cedula-appointment");
        revalidatePath("/user/services/cedula");

        return { success: true };
    } catch (err: any) {
        console.error("Error saving Cedula calculator settings:", err);
        return { success: false, error: err.message || "Failed to save settings." };
    }
}
