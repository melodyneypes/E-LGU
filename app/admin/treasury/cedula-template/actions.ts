"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
    CedulaLayoutSettings,
    DEFAULT_CEDULA_LAYOUT,
    DEFAULT_CEDULA_FIELDS
} from "@/lib/cedula-template-config";

const SETTING_KEY = "cedula_layout_config";

/**
 * Fetch saved Cedula layout configuration from SystemSetting
 */
export async function getCedulaLayoutAction(): Promise<{ success: boolean; data: CedulaLayoutSettings; error?: string }> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEY }
        });

        if (!setting || !setting.value) {
            return { success: true, data: DEFAULT_CEDULA_LAYOUT };
        }

        try {
            const parsed = JSON.parse(setting.value) as CedulaLayoutSettings;
            // Merge with defaults in case new fields were added
            const mergedFields = {
                ...DEFAULT_CEDULA_FIELDS,
                ...(parsed.fields || {})
            };
            // Ensure ctcNumber, taxableIncomeBasis, and old taxpayerName are cleaned if previously saved
            delete (mergedFields as any).ctcNumber;
            delete (mergedFields as any).taxableIncomeBasis;
            delete (mergedFields as any).taxpayerName;

            // Ensure separate name fields exist
            if (!mergedFields.lastName) mergedFields.lastName = DEFAULT_CEDULA_FIELDS.lastName;
            if (!mergedFields.firstName) mergedFields.firstName = DEFAULT_CEDULA_FIELDS.firstName;
            if (!mergedFields.middleName) mergedFields.middleName = DEFAULT_CEDULA_FIELDS.middleName;

            // Ensure tin has default letterSpacing
            if (mergedFields.tin && mergedFields.tin.letterSpacing === undefined) {
                mergedFields.tin.letterSpacing = DEFAULT_CEDULA_FIELDS.tin.letterSpacing;
            }

            // Remove any fields explicitly deleted by the user
            if (Array.isArray((parsed as any).deletedFields)) {
                for (const delId of (parsed as any).deletedFields) {
                    delete (mergedFields as any)[delId];
                }
            }
            // Ensure 4 civil status check fields exist and are positioned below FILIPINO
            if (!mergedFields.civilStatusSingle || mergedFields.civilStatusSingle.x > 75) {
                mergedFields.civilStatusSingle = DEFAULT_CEDULA_FIELDS.civilStatusSingle;
            }
            if (!mergedFields.civilStatusMarried || mergedFields.civilStatusMarried.x > 75) {
                mergedFields.civilStatusMarried = DEFAULT_CEDULA_FIELDS.civilStatusMarried;
            }
            if (!mergedFields.civilStatusWidowed || mergedFields.civilStatusWidowed.x > 75) {
                mergedFields.civilStatusWidowed = DEFAULT_CEDULA_FIELDS.civilStatusWidowed;
            }
            if (!mergedFields.civilStatusDivorced || mergedFields.civilStatusDivorced.x > 75) {
                mergedFields.civilStatusDivorced = DEFAULT_CEDULA_FIELDS.civilStatusDivorced;
            }

            return {
                success: true,
                data: {
                    ...DEFAULT_CEDULA_LAYOUT,
                    ...parsed,
                    fields: mergedFields
                }
            };
        } catch {
            return { success: true, data: DEFAULT_CEDULA_LAYOUT };
        }
    } catch (error: any) {
        console.error("getCedulaLayoutAction error:", error);
        return { success: false, data: DEFAULT_CEDULA_LAYOUT, error: error?.message || "Failed to load layout" };
    }
}

/**
 * Save Cedula layout configuration to SystemSetting
 */
export async function saveCedulaLayoutAction(layout: CedulaLayoutSettings): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        const userDept = (session?.user as any)?.department?.toUpperCase();

        const isAllowed =
            userRole === "ADMIN" ||
            userRole === "TREASURY_STAFF" ||
            userRole === "ADMIN_AIDE" ||
            userDept === "TREASURY";

        if (!isAllowed) {
            return { success: false, error: "Access Denied: Only Treasury Staff or Admins can save Cedula templates." };
        }

        await prisma.systemSetting.upsert({
            where: { key: SETTING_KEY },
            update: {
                value: JSON.stringify(layout),
                updatedAt: new Date()
            },
            create: {
                key: SETTING_KEY,
                value: JSON.stringify(layout),
                description: "Coordinates, dimensions, and styling configuration for Cedula print template."
            }
        });

        revalidatePath("/admin/treasury/cedula-template");
        revalidatePath("/admin/treasury");
        return { success: true };
    } catch (error: any) {
        console.error("saveCedulaLayoutAction error:", error);
        return { success: false, error: error?.message || "Failed to save Cedula layout configuration" };
    }
}

/**
 * Reset Cedula layout configuration to defaults
 */
export async function resetCedulaLayoutAction(): Promise<{ success: boolean; data: CedulaLayoutSettings; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        const userDept = (session?.user as any)?.department?.toUpperCase();

        const isAllowed =
            userRole === "ADMIN" ||
            userRole === "TREASURY_STAFF" ||
            userRole === "ADMIN_AIDE" ||
            userDept === "TREASURY";

        if (!isAllowed) {
            return { success: false, data: DEFAULT_CEDULA_LAYOUT, error: "Access Denied" };
        }

        await prisma.systemSetting.upsert({
            where: { key: SETTING_KEY },
            update: {
                value: JSON.stringify(DEFAULT_CEDULA_LAYOUT),
                updatedAt: new Date()
            },
            create: {
                key: SETTING_KEY,
                value: JSON.stringify(DEFAULT_CEDULA_LAYOUT),
                description: "Coordinates, dimensions, and styling configuration for Cedula print template."
            }
        });

        revalidatePath("/admin/treasury/cedula-template");
        return { success: true, data: DEFAULT_CEDULA_LAYOUT };
    } catch (error: any) {
        console.error("resetCedulaLayoutAction error:", error);
        return { success: false, data: DEFAULT_CEDULA_LAYOUT, error: error?.message || "Failed to reset layout" };
    }
}
