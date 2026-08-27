"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

/**
 * 1. SECURITY & PERMISSIONS:
 * Strict LGU Admin or delegated permission validation
 */
async function verifyCredentialsSettingsAccess() {
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
        throw new Error("Unauthorized. Only LGU Administrators or assigned Admin staff have permission to update Credentials.");
    }
    return session.user;
}

/**
 * 2. FAST & LEAN CRUD + 3. ERROR HANDLING & ROLLBACK + 5. AUDIT TRAIL LOGGING
 * Updates system credentials: portal_name, emergency_phone
 */
export async function updateSystemCredentials(formData: { portalName?: string; emergencyPhone?: string }) {
    try {
        await verifyCredentialsSettingsAccess();

        const portalName = typeof formData.portalName === "string" ? formData.portalName.trim() : "";
        const emergencyPhone = typeof formData.emergencyPhone === "string" ? formData.emergencyPhone.trim() : "";

        // Query existing values for accurate audit state diffing
        const oldSettings = await prisma.systemSetting.findMany({
            where: {
                key: { in: ["portal_name", "emergency_phone"] }
            }
        });

        const oldMap = new Map(oldSettings.map(s => [s.key, s.value]));
        const oldPortalName = oldMap.get("portal_name") ?? "";
        const oldEmergencyPhone = oldMap.get("emergency_phone") ?? "";

        const changes: Record<string, { old: string; new: string }> = {};
        const changedLabels: string[] = [];

        if (oldPortalName !== portalName) {
            changes["portal_name"] = { old: oldPortalName || "(Empty)", new: portalName || "(Empty)" };
            changedLabels.push("Portal Name");
        }

        if (oldEmergencyPhone !== emergencyPhone) {
            changes["emergency_phone"] = { old: oldEmergencyPhone || "(Empty)", new: emergencyPhone || "(Empty)" };
            changedLabels.push("Emergency Contact Hotline");
        }

        // If no modifications detected
        if (changedLabels.length === 0) {
            return { success: true, message: "No credential changes detected." };
        }

        // Atomic Transaction Rollback: Updates both keys atomically
        await prisma.$transaction([
            prisma.systemSetting.upsert({
                where: { key: "portal_name" },
                update: { value: portalName },
                create: { key: "portal_name", value: portalName }
            }),
            prisma.systemSetting.upsert({
                where: { key: "emergency_phone" },
                update: { value: emergencyPhone },
                create: { key: "emergency_phone", value: emergencyPhone }
            })
        ]);

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // 5. Audit Logging with State Diff
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Settings",
                entityId: "system_credentials",
                entityName: "System Credentials & Contact",
                description: `Updated ${changedLabels.join(" and ")}`,
                metadata: {
                    changedFields: changedLabels,
                    changes
                }
            });
        } catch (auditErr) {
            console.warn("[updateSystemCredentials] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[updateSystemCredentials] Error:", error);
        return { 
            success: false, 
            error: error?.message || "Failed to update system credentials. Please try again." 
        };
    }
}