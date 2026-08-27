"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { logActivity } from "@/lib/audit";

/**
 * Helper to verify municipal LGU admin or delegated access privileges
 * Allowed:
 * 1. Role: ADMIN with Department: LGU
 * 2. Role: ADMIN with "/admin/settings" explicitly in accessiblePages
 */
async function verifyGeneralSettingsAccess() {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentDepartment = (session?.user as any)?.department;
    const accessiblePages = ((session?.user as any)?.accessiblePages || []) as string[];

    const isLguAdmin = currentUserRole === "ADMIN" && currentDepartment === "LGU";
    const isAssignedAdmin = currentUserRole === "ADMIN" && accessiblePages.some(page => 
        page === "/admin/settings" || 
        page.startsWith("/admin/settings")
    );

    if (!session?.user?.id || (!isLguAdmin && !isAssignedAdmin)) {
        throw new Error("Unauthorized. Only LGU Administrators or assigned Admin staff have permission to update General Settings.");
    }
    return session.user;
}

/**
 * Helper to safely delete an old image file from storage bucket
 */
async function deleteOldStorageImage(fileUrl: string | null | undefined) {
    if (!fileUrl) return;
    try {
        await deleteFileByUrl(fileUrl);
    } catch (err) {
        console.warn("[deleteOldStorageImage] Failed to delete old image from storage bucket:", err);
    }
}

/**
 * Update a single general setting toggle (e.g. maintenance_mode, kiosk_maintenance_mode)
 */
export async function updateGeneralSettingToggle(key: string, value: string) {
    try {
        await verifyGeneralSettingsAccess();

        if (key === "maintenance_mode") {
            await prisma.$transaction([
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value }
                }),
                prisma.systemSetting.upsert({
                    where: { key: "maintenance_mode_updated_at" },
                    update: { value: Date.now().toString() },
                    create: { key: "maintenance_mode_updated_at", value: Date.now().toString() }
                })
            ]);
        } else {
            await prisma.systemSetting.upsert({
                where: { key },
                update: { value },
                create: { key, value }
            });
        }

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // Log System Setting Change
        const labelMap: Record<string, string> = {
            maintenance_mode: "Public Portal Maintenance Mode",
            kiosk_maintenance_mode: "Kiosk Terminals Maintenance Mode"
        };
        const friendlyName = labelMap[key] || key;
        const isEnabled = value === "true" || value === "1";

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "SystemSetting",
                entityId: key,
                entityName: friendlyName,
                description: `Turned ${isEnabled ? "ON" : "OFF"} ${friendlyName}`,
                metadata: {
                    settingKey: key,
                    status: isEnabled ? "ENABLED" : "DISABLED",
                    changes: {
                        [key]: {
                            old: !isEnabled ? "ENABLED" : "DISABLED",
                            new: isEnabled ? "ENABLED" : "DISABLED"
                        }
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[updateGeneralSettingToggle] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[updateGeneralSettingToggle] Error:", error);
        return { success: false, error: error?.message || "Failed to update setting." };
    }
}

/**
 * Update Site Logo (with storage upload, error rollback, and automatic deletion of old logo)
 */
export async function updateSiteLogo(formData: FormData) {
    let newlyUploadedUrl: string | null = null;
    let oldLogoUrl: string | null = null;

    try {
        await verifyGeneralSettingsAccess();

        const oldSetting = await prisma.systemSetting.findUnique({
            where: { key: "site_logo" }
        });
        oldLogoUrl = oldSetting?.value || null;

        const file = (formData.get("logo") || formData.get("logoFile")) as File | null;
        const manualUrl = formData.get("imageUrl") as string;

        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'png';
            const filename = `logo-${Date.now()}.${ext}`;
            const storagePath = `logos/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload new logo file to cloud storage bucket.");
            }
        }

        const finalUrl = newlyUploadedUrl || manualUrl || "";

        // Update database setting
        await prisma.systemSetting.upsert({
            where: { key: "site_logo" },
            update: { value: finalUrl },
            create: { key: "site_logo", value: finalUrl }
        });

        // If DB update succeeds and a new logo was uploaded, safely delete the old logo from storage
        if (oldLogoUrl && oldLogoUrl !== finalUrl && oldLogoUrl.includes("supabase.co")) {
            await deleteOldStorageImage(oldLogoUrl);
        }

        revalidatePath("/");
        revalidatePath("/admin/settings");

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Settings",
                entityId: "site_logo",
                entityName: "Municipal Site Logo",
                description: "Updated municipal portal official logo",
                metadata: {
                    changes: {
                        site_logo: {
                            old: oldLogoUrl || "None",
                            new: finalUrl || "None"
                        }
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[updateSiteLogo] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, imageUrl: finalUrl };
    } catch (error: any) {
        console.error("[updateSiteLogo] Error:", error);

        // Error Rollback: If DB failed but we uploaded a new file to storage, clean it up!
        if (newlyUploadedUrl) {
            await deleteOldStorageImage(newlyUploadedUrl);
        }

        return { success: false, error: error?.message || "Failed to update site logo." };
    }
}

/**
 * Batch update General Identity, Branding, Apps, Social, and Contact settings
 * Fully atomic via Prisma $transaction
 */
export async function saveGeneralIdentitySettings(settingsList: { key: string; value: string }[]) {
    try {
        await verifyGeneralSettingsAccess();

        if (!settingsList || settingsList.length === 0) {
            return { success: true, message: "No changes to update." };
        }

        // Allowed key whitelist to prevent arbitrary key injections
        const allowedKeys = new Set([
            "site_logo",
            "brand_word_1",
            "brand_word_2",
            "theme_color",
            "app_google_play_url",
            "app_app_store_url",
            "app_apk_download_url",
            "social_facebook",
            "social_twitter",
            "social_instagram",
            "contact_address",
            "contact_email",
            "contact_phone",
        ]);

        const filteredSettings = settingsList.filter(s => allowedKeys.has(s.key));

        if (filteredSettings.length === 0) {
            return { success: false, error: "No valid settings parameters provided." };
        }

        // Fetch old values to build accurate audit diff
        const oldSettings = await prisma.systemSetting.findMany({
            where: {
                key: { in: filteredSettings.map(s => s.key) }
            }
        });
        const oldMap = new Map(oldSettings.map(s => [s.key, s.value]));

        const changes: Record<string, { old: any; new: any }> = {};
        const changedLabels: string[] = [];

        const labelMap: Record<string, string> = {
            brand_word_1: "Brand First Word",
            brand_word_2: "Brand Second Word",
            theme_color: "Theme Color",
            app_google_play_url: "Google Play Store Link",
            app_app_store_url: "Apple App Store Link",
            app_apk_download_url: "APK Download Link",
            social_facebook: "Facebook URL",
            social_twitter: "Twitter / X URL",
            social_instagram: "Instagram URL",
            contact_address: "Office Address",
            contact_email: "Official Email",
            contact_phone: "Contact Number",
            site_logo: "Site Logo URL",
        };

        filteredSettings.forEach(({ key, value }) => {
            const oldVal = oldMap.get(key) || "Not configured";
            if (oldVal !== value) {
                changes[key] = { old: oldVal, new: value };
                changedLabels.push(labelMap[key] || key);
            }
        });

        // Atomic Transaction: All succeed or all rollback
        await prisma.$transaction(
            filteredSettings.map(({ key, value }) =>
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value }
                })
            )
        );

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // Log batch updates in Audit Trail
        if (changedLabels.length > 0) {
            try {
                await logActivity({
                    action: "UPDATE",
                    entityType: "Settings",
                    entityId: "general_identity",
                    entityName: "Municipal General Identity",
                    description: `Updated ${changedLabels.join(", ")}`,
                    metadata: {
                        changedFields: changedLabels,
                        changes
                    }
                });
            } catch (auditErr) {
                console.warn("[saveGeneralIdentitySettings] Audit log warning (non-blocking):", auditErr);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("[saveGeneralIdentitySettings] Error:", error);
        return { success: false, error: error?.message || "Failed to save general identity settings." };
    }
}
