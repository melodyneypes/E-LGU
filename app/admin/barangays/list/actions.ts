"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

/**
 * Helper to verify municipal admin or delegated access privileges
 * Allowed:
 * 1. Role: ADMIN with Department: LGU
 * 2. Role: ADMIN with "/admin/barangays/list" explicitly in accessiblePages
 */
async function verifyLguAdminSession() {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentDepartment = (session?.user as any)?.department;
    const accessiblePages = ((session?.user as any)?.accessiblePages || []) as string[];

    const isLguAdmin = currentUserRole === "ADMIN" && currentDepartment === "LGU";
    const isAssignedAdmin = currentUserRole === "ADMIN" && accessiblePages.some(page => 
        page === "/admin/barangays/list" || 
        page === "/admin/barangays" || 
        page.startsWith("/admin/barangays")
    );

    if (!session?.user?.id || (!isLguAdmin && !isAssignedAdmin)) {
        throw new Error("Unauthorized. Only LGU Administrators or assigned Admin staff have permission to manage Barangays.");
    }
    return session.user;
}

/**
 * Ultra-fast query for fetching the list of Barangays
 */
export async function getBarangays() {
    try {
        await verifyLguAdminSession();

        const barangays = await prisma.barangayInfo.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, data: barangays };
    } catch (error: any) {
        console.error("[getBarangays] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch barangays." };
    }
}

/**
 * Register a new Barangay entry (name only, lightweight & fast)
 */
export async function addBarangay(formData: FormData) {
    try {
        await verifyLguAdminSession();

        const name = (formData.get("name") as string)?.trim();

        if (!name) {
            return { success: false, error: "Barangay name is required." };
        }

        // Check if barangay name already exists
        const existing = await prisma.barangayInfo.findFirst({
            where: { 
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });

        if (existing) {
            return { success: false, error: `Barangay "${name}" is already registered.` };
        }

        const newBarangay = await prisma.barangayInfo.create({
            data: { name },
            select: {
                id: true,
                name: true,
                createdAt: true,
            }
        });

        // Log Barangay Creation in Audit Trail
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Barangay",
                entityId: newBarangay.id,
                entityName: name,
                description: `Registered new Barangay: "${name}"`,
                metadata: { name }
            });
        } catch (auditError) {
            console.warn("[addBarangay] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/list");
        return { success: true, barangay: newBarangay };
    } catch (error: any) {
        console.error("[addBarangay] Error:", error);
        return { success: false, error: error?.message || "Failed to create barangay entry." };
    }
}

/**
 * Update an existing Barangay entry
 */
export async function updateBarangay(id: string, formData: FormData) {
    try {
        await verifyLguAdminSession();

        if (!id) {
            return { success: false, error: "Missing barangay identifier." };
        }

        const name = (formData.get("name") as string)?.trim();

        if (!name) {
            return { success: false, error: "Barangay name is required." };
        }

        const oldItem = await prisma.barangayInfo.findUnique({
            where: { id },
            select: { id: true, name: true }
        });

        if (!oldItem) {
            return { success: false, error: "Barangay not found or already removed." };
        }

        // Check name collision with other barangays
        const duplicateCheck = await prisma.barangayInfo.findFirst({
            where: {
                id: { not: id },
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });

        if (duplicateCheck) {
            return { success: false, error: `Another barangay is already named "${name}".` };
        }

        const updatedBarangay = await prisma.barangayInfo.update({
            where: { id },
            data: { name },
            select: {
                id: true,
                name: true,
                createdAt: true,
            }
        });

        // Log Barangay Update in Audit Trail with diff
        try {
            const hasNameChanged = oldItem.name !== name;
            await logActivity({
                action: "UPDATE",
                entityType: "Barangay",
                entityId: id,
                entityName: name,
                description: hasNameChanged 
                    ? `Renamed Barangay from "${oldItem.name}" to "${name}"`
                    : `Saved Barangay: "${name}"`,
                metadata: {
                    previousName: oldItem.name,
                    newName: name,
                    changes: hasNameChanged ? {
                        name: {
                            old: oldItem.name,
                            new: name
                        }
                    } : undefined
                }
            });
        } catch (auditError) {
            console.warn("[updateBarangay] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/list");
        return { success: true, barangay: updatedBarangay };
    } catch (error: any) {
        console.error("[updateBarangay] Error:", error);
        return { success: false, error: error?.message || "Failed to update barangay entry." };
    }
}

/**
 * Delete a Barangay entry with safety checks and audit logging
 */
export async function deleteBarangay(id: string) {
    try {
        await verifyLguAdminSession();

        if (!id) {
            return { success: false, error: "Missing barangay identifier." };
        }

        const item = await prisma.barangayInfo.findUnique({
            where: { id },
            select: { id: true, name: true }
        });

        if (!item) {
            return { success: false, error: "Barangay not found or already deleted." };
        }

        // Safety check: Warn/Prevent if active Barangay Admins are assigned to this barangay
        const assignedAdminsCount = await prisma.user.count({
            where: { managedBarangay: item.name }
        });

        if (assignedAdminsCount > 0) {
            return { 
                success: false, 
                error: `Cannot delete Barangay "${item.name}" because there are ${assignedAdminsCount} active admin/captain account(s) assigned to it. Please reassign or delete those accounts first.` 
            };
        }

        await prisma.barangayInfo.delete({
            where: { id }
        });

        // Log Barangay Deletion in Audit Trail
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Barangay",
                entityId: id,
                entityName: item.name,
                description: `Deleted Barangay: "${item.name}"`,
                metadata: { 
                    name: item.name,
                    deletedRecordSnapshot: item
                }
            });
        } catch (auditError) {
            console.warn("[deleteBarangay] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/list");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteBarangay] Error:", error);
        return { success: false, error: error?.message || "Failed to delete barangay entry." };
    }
}
