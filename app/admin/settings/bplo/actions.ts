"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveBploSettingsAction(settings: Record<string, string>) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || user.role !== "ADMIN" || user.department?.toUpperCase() !== "LGU") {
            return { success: false, error: "Unauthorized" };
        }

        const allowedKeys = [
            "bplo_tax_rate_new",
            "bplo_health_card_fee",
            "bplo_retail_tax_rate_low",
            "bplo_retail_tax_rate_high",
            "bplo_manufacturer_tax_rate",
            "bplo_wholesaler_tax_rate",
            "bplo_mayors_permit_matrix",
            "bplo_sanitary_fee_matrix",
            "bplo_garbage_fee_matrix",
            "bplo_mayors_tax_clearance_fee"
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
                        description: `BPLO Calculator parameter: ${key}`
                    }
                });
            })
        );

        revalidatePath("/admin/settings/bplo");
        revalidatePath("/admin/bplo");
        revalidatePath("/user/services/business-permit-appointment");

        return { success: true };
    } catch (err: any) {
        console.error("Error saving BPLO calculator settings:", err);
        return { success: false, error: err.message || "Failed to save settings." };
    }
}
