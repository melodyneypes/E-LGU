"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

/**
 * 1. SECURITY & PERMISSIONS:
 * Strict LGU Administrator validation
 */
async function verifySectionsAccess() {
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
        throw new Error("Unauthorized. Only LGU Administrators or assigned Admin staff have permission to configure Landing Sections.");
    }
    return session.user;
}

const SECTION_LABELS: Record<string, string> = {
    section_dining_lodging: "Kainan at Tuluyan",
    section_places_to_visit: "Gallery",
    section_events: "Upcoming Events",
    section_announcements: "Announcements",
    section_lgu_projects: "LGU Projects",
    section_jobs: "Serve the Community",
    section_government: "Municipal Government",
    section_services: "Services & Projects",
    section_emergency: "Emergency Hotlines",
    section_church: "Parish Corner",
    section_map: "Municipality Monitoring",
    section_app_download: "Mobile App Downloads",
};

/**
 * 2. FAST & LEAN CRUD + 3. ERROR HANDLING + 5. AUDIT TRAIL LOGGING
 * Toggle landing section visibility
 */
export async function toggleLandingSectionVisibility(key: string, isEnabled: boolean) {
    try {
        await verifySectionsAccess();

        if (!SECTION_LABELS[key]) {
            return { success: false, error: "Invalid section identifier." };
        }

        const value = isEnabled ? "true" : "false";

        // Query existing state for accurate audit logging
        const existing = await prisma.systemSetting.findUnique({
            where: { key }
        });
        const wasEnabled = existing ? (existing.value !== "false") : true;

        // Perform Database Upsert
        await prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        revalidatePath("/");
        revalidatePath("/admin/settings");

        const sectionName = SECTION_LABELS[key] || key;

        // 5. Audit Logging with State Diff
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "LandingSection",
                entityId: key,
                entityName: sectionName,
                description: `${isEnabled ? "Enabled" : "Disabled"} landing section: "${sectionName}"`,
                metadata: {
                    settingKey: key,
                    sectionName,
                    status: isEnabled ? "ENABLED" : "DISABLED",
                    changes: {
                        visibility: {
                            old: wasEnabled ? "ENABLED" : "DISABLED",
                            new: isEnabled ? "ENABLED" : "DISABLED"
                        }
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[toggleLandingSectionVisibility] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[toggleLandingSectionVisibility] Error:", error);
        return { 
            success: false, 
            error: error?.message || "Failed to update section visibility. Please try again." 
        };
    }
}
