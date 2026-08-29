"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { getSystemSetting } from "@/lib/settings";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    managedBarangay?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), MAYOR, TREASURY_ADMIN, BARANGAY_ADMIN, or custom accessiblePages
 */
export async function verifyLogisticsAccess(): Promise<{
    user: SessionUser;
    isBarangayAdmin: boolean;
    managedBarangay: string | null;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isMayor = role === "MAYOR";
    const isTreasuryAdmin = role === "TREASURY_ADMIN" || department === "TREASURY";
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/logistics");

    if (!isLguAdmin && !isMayor && !isTreasuryAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage delivery logistics.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * 2. GET ALL BARANGAY LOGISTICS (LEAN SELECT WITH SCOPING)
 */
export async function getAllBarangayLogistics() {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyLogisticsAccess();

        const whereClause: any = {};
        if (isBarangayAdmin && managedBarangay) {
            whereClause.name = managedBarangay;
        }

        const barangays = await prisma.barangayInfo.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                deliveryFee: true,
                isLogisticsActive: true,
                estimatedDeliveryDays: true,
                updatedAt: true
            },
            orderBy: { name: "asc" }
        });

        return { success: true, data: barangays };
    } catch (error: any) {
        console.error("[getAllBarangayLogistics] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch logistics data." };
    }
}

/**
 * 3. GET BARANGAY LOGISTICS BY ID
 */
export async function getBarangayLogisticsById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Barangay ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyLogisticsAccess();

        const item = await prisma.barangayInfo.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                deliveryFee: true,
                isLogisticsActive: true,
                estimatedDeliveryDays: true,
                updatedAt: true
            }
        });

        if (!item) {
            return { success: false, error: "Barangay logistics node not found." };
        }

        if (isBarangayAdmin && item.name !== managedBarangay) {
            return { success: false, error: "Unauthorized access to another barangay node." };
        }

        return { success: true, data: item };
    } catch (error: any) {
        console.error("[getBarangayLogisticsById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch logistics node." };
    }
}

/**
 * 4. CREATE BARANGAY LOGISTICS NODE + AUDIT LOGGING
 */
export async function createBarangayLogistics(
    name: string,
    data: { deliveryFee: number; isLogisticsActive: boolean; estimatedDeliveryDays: number }
) {
    try {
        if (!name?.trim()) {
            return { success: false, error: "Barangay name is required." };
        }

        await verifyLogisticsAccess();

        const trimmedName = name.trim();

        const existing = await prisma.barangayInfo.findUnique({
            where: { name: trimmedName }
        });

        if (existing) {
            return { success: false, error: `Barangay "${trimmedName}" logistics node already exists.` };
        }

        const created = await prisma.barangayInfo.create({
            data: {
                name: trimmedName,
                deliveryFee: data.deliveryFee,
                isLogisticsActive: data.isLogisticsActive,
                estimatedDeliveryDays: data.estimatedDeliveryDays
            }
        });

        revalidatePath("/admin/logistics");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "LogisticsControl",
                entityId: created.id,
                entityName: trimmedName,
                description: `Created delivery logistics node for Brgy. ${trimmedName}: ₱${data.deliveryFee} fee, ${data.estimatedDeliveryDays} days (Active: ${data.isLogisticsActive})`,
                metadata: {
                    barangay: trimmedName,
                    deliveryFee: data.deliveryFee,
                    isLogisticsActive: data.isLogisticsActive,
                    estimatedDeliveryDays: data.estimatedDeliveryDays
                }
            });
        } catch (auditErr) {
            console.warn("[createBarangayLogistics] Audit log warning:", auditErr);
        }

        return { success: true, data: created };
    } catch (error: any) {
        console.error("[createBarangayLogistics] Error:", error);
        return { success: false, error: error?.message || "Failed to create barangay logistics node." };
    }
}

/**
 * 5. UPDATE BARANGAY LOGISTICS + AUDIT STATE DIFFS
 */
export async function updateBarangayLogistics(
    id: string,
    data: { deliveryFee: number; isLogisticsActive: boolean; estimatedDeliveryDays: number }
) {
    try {
        if (!id) {
            return { success: false, error: "Barangay ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyLogisticsAccess();

        const existing = await prisma.barangayInfo.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Barangay logistics node not found." };
        }

        if (isBarangayAdmin && existing.name !== managedBarangay) {
            return { success: false, error: "Unauthorized to modify another barangay node." };
        }

        const updated = await prisma.barangayInfo.update({
            where: { id },
            data: {
                deliveryFee: data.deliveryFee,
                isLogisticsActive: data.isLogisticsActive,
                estimatedDeliveryDays: data.estimatedDeliveryDays
            }
        });

        revalidatePath("/admin/logistics");

        // Audit Logging with State Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (Number(existing.deliveryFee) !== Number(data.deliveryFee)) {
                changes["deliveryFee"] = { old: existing.deliveryFee, new: data.deliveryFee };
            }
            if (existing.isLogisticsActive !== data.isLogisticsActive) {
                changes["isLogisticsActive"] = { old: existing.isLogisticsActive, new: data.isLogisticsActive };
            }
            if (existing.estimatedDeliveryDays !== data.estimatedDeliveryDays) {
                changes["estimatedDeliveryDays"] = { old: existing.estimatedDeliveryDays, new: data.estimatedDeliveryDays };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "LogisticsControl",
                entityId: id,
                entityName: updated.name,
                description: `Updated delivery logistics for Brgy. ${updated.name}: ₱${data.deliveryFee} fee, ${data.estimatedDeliveryDays} days (Active: ${data.isLogisticsActive})`,
                metadata: {
                    barangay: updated.name,
                    changes,
                    deliveryFee: data.deliveryFee,
                    isLogisticsActive: data.isLogisticsActive,
                    estimatedDeliveryDays: data.estimatedDeliveryDays
                }
            });
        } catch (auditErr) {
            console.warn("[updateBarangayLogistics] Audit log warning:", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[updateBarangayLogistics] Error:", error);
        return { success: false, error: error?.message || "Failed to update logistics configuration." };
    }
}

/**
 * 6. DELETE BARANGAY LOGISTICS NODE + AUDIT SNAPSHOT
 */
export async function deleteBarangayLogistics(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Barangay ID is required." };
        }

        const { isBarangayAdmin } = await verifyLogisticsAccess();
        if (isBarangayAdmin) {
            return { success: false, error: "Only LGU Administrator can delete logistics nodes." };
        }

        const existing = await prisma.barangayInfo.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Barangay node not found." };
        }

        await prisma.barangayInfo.delete({
            where: { id }
        });

        revalidatePath("/admin/logistics");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "LogisticsControl",
                entityId: id,
                entityName: existing.name,
                description: `Deleted delivery logistics node for Brgy. ${existing.name}`,
                metadata: {
                    deletedRecordSnapshot: existing
                }
            });
        } catch (auditErr) {
            console.warn("[deleteBarangayLogistics] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteBarangayLogistics] Error:", error);
        return { success: false, error: error?.message || "Failed to delete logistics node." };
    }
}

/**
 * 7. SYSTEM SETTINGS HELPER
 */
export async function getSystemSettingAction(key: string, defaultValue: string = "") {
    try {
        const value = await getSystemSetting(key, defaultValue);
        return { success: true, data: value };
    } catch (error) {
        console.error(`Error fetching system setting ${key}:`, error);
        return { success: false, error: "Failed to fetch setting", data: defaultValue };
    }
}
