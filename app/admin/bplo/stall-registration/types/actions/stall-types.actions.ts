"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), TREASURY_STAFF, TREASURY_OFFICER, ADMIN_AIDE, or custom accessiblePages
 */
export async function verifyBploStallTypesAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isBplo = role === "BPLO" || role === "BPLO_STAFF" || role === "BPLO_OFFICER" || role === "ADMIN_AIDE" || role === "MAYOR" || department === "BPLO";
    const isTreasury = role === "TREASURY_STAFF" || role === "TREASURY_OFFICER" || department === "TREASURY";
    const hasPageAccess = accessiblePages.includes("/admin/bplo/stall-registration/types") || accessiblePages.includes("/admin/bplo/stall-registration") || accessiblePages.includes("/admin/bplo");

    if (isTreasury || (!isLguAdmin && !isBplo && !hasPageAccess)) {
        throw new Error("Forbidden: You do not have permissions to manage Market Stall Types.");
    }

    return user;
}

/**
 * 2. GET ALL STALL TYPES (LEAN QUERY)
 */
export async function getStallTypes() {
    try {
        await verifyBploStallTypesAccess();

        const stallTypes = await (prisma as any).stallType.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                isActive: true,
                createdBy: true,
                updatedBy: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { stalls: true },
                },
            },
            orderBy: { name: "asc" },
        });

        return { success: true, data: stallTypes, stallTypes };
    } catch (error: any) {
        console.error("[getStallTypes] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch stall types." };
    }
}

/**
 * 3. GET STALL TYPE BY ID (FAST MODAL SYNC)
 */
export async function getStallTypeById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Stall type ID is required." };
        }

        await verifyBploStallTypesAccess();

        const stallType = await (prisma as any).stallType.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                isActive: true,
                createdBy: true,
                updatedBy: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { stalls: true },
                },
            },
        });

        if (!stallType) {
            return { success: false, error: "Stall type record not found." };
        }

        return { success: true, data: stallType, stallType };
    } catch (error: any) {
        console.error("[getStallTypeById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch stall type." };
    }
}

/**
 * 4. CREATE STALL TYPE + AUDIT LOGGING
 */
export async function createStallType(data: {
    code: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
}) {
    try {
        const user = await verifyBploStallTypesAccess();
        const userName = user.name || user.email || "System";

        const code = data.code.trim().toUpperCase();
        const name = data.name.trim();
        const description = data.description?.trim() || null;
        const isActive = data.isActive !== undefined ? data.isActive : true;

        if (!code) {
            return { success: false, error: "Section code is required (e.g. DRY-01)." };
        }
        if (!name) {
            return { success: false, error: "Section name is required (e.g. Dry Goods Section)." };
        }

        // Check for duplicate code
        const existing = await (prisma as any).stallType.findUnique({
            where: { code },
        });

        if (existing) {
            return { success: false, error: `A section with code "${code}" already exists.` };
        }

        const newStallType = await (prisma as any).stallType.create({
            data: {
                code,
                name,
                description,
                isActive,
                createdBy: userName,
                updatedBy: userName,
            },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "StallType",
                entityId: newStallType.id,
                entityName: `${name} (${code})`,
                description: `Created Market Section: "${name}" [${code}]`,
                metadata: {
                    code,
                    name,
                    description,
                    isActive,
                },
            });
        } catch (auditErr) {
            console.warn("[createStallType] Audit log warning:", auditErr);
        }

        return { success: true, data: newStallType, stallType: newStallType };
    } catch (error: any) {
        console.error("[createStallType] Error:", error);
        return { success: false, error: error?.message || "Failed to create stall type." };
    }
}

/**
 * 5. UPDATE STALL TYPE + PRECISE AUDIT DIFFS
 */
export async function updateStallType(
    id: string,
    data: {
        code?: string;
        name?: string;
        description?: string | null;
        isActive?: boolean;
    }
) {
    try {
        if (!id) {
            return { success: false, error: "Stall type ID is required." };
        }

        const user = await verifyBploStallTypesAccess();
        const userName = user.name || user.email || "System";

        const existing = await (prisma as any).stallType.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Stall type record not found." };
        }

        const newCode = data.code ? data.code.trim().toUpperCase() : existing.code;
        const newName = data.name ? data.name.trim() : existing.name;
        const newDescription = data.description !== undefined ? (data.description ? data.description.trim() : null) : existing.description;
        const newIsActive = data.isActive !== undefined ? data.isActive : existing.isActive;

        // Check if updating code conflicts with another record
        if (data.code && newCode !== existing.code) {
            const conflict = await (prisma as any).stallType.findUnique({
                where: { code: newCode },
            });
            if (conflict && conflict.id !== id) {
                return { success: false, error: `A section with code "${newCode}" already exists.` };
            }
        }

        const updated = await (prisma as any).stallType.update({
            where: { id },
            data: {
                code: newCode,
                name: newName,
                description: newDescription,
                isActive: newIsActive,
                updatedBy: userName,
            },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.code !== newCode) {
                changes["code"] = { old: existing.code, new: newCode };
            }
            if (existing.name !== newName) {
                changes["name"] = { old: existing.name, new: newName };
            }
            if ((existing.description || "") !== (newDescription || "")) {
                changes["description"] = { old: existing.description || "None", new: newDescription || "None" };
            }
            if (existing.isActive !== newIsActive) {
                changes["isActive"] = { old: existing.isActive, new: newIsActive };
            }

            const modifiedFields = Object.keys(changes);
            const desc = modifiedFields.length > 0
                ? `Updated Market Section "${updated.name}" (Modified: ${modifiedFields.join(", ")})`
                : `Updated Market Section "${updated.name}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "StallType",
                entityId: id,
                entityName: `${updated.name} (${updated.code})`,
                description: desc,
                metadata: {
                    code: updated.code,
                    name: updated.name,
                    changes,
                },
            });
        } catch (auditErr) {
            console.warn("[updateStallType] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, stallType: updated };
    } catch (error: any) {
        console.error("[updateStallType] Error:", error);
        return { success: false, error: error?.message || "Failed to update stall type." };
    }
}

export async function toggleStallTypeStatus(id: string, currentStatus: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Stall type ID is required." };
        }

        const user = await verifyBploStallTypesAccess();
        const userName = user.name || user.email || "System";

        const newStatus = !currentStatus;

        // Lean, single-roundtrip direct DB update
        const updated = await (prisma as any).stallType.update({
            where: { id },
            data: { isActive: newStatus, updatedBy: userName },
            select: { id: true, name: true, code: true, isActive: true },
        });

        // Non-blocking background audit log (doesn't stall client response)
        logActivity({
            action: "UPDATE",
            entityType: "StallType",
            entityId: id,
            entityName: `${updated.name} (${updated.code})`,
            description: `Toggled Market Section "${updated.name}" status to ${newStatus ? "Active" : "Inactive"}`,
            metadata: {
                code: updated.code,
                name: updated.name,
                changes: {
                    isActive: { old: currentStatus, new: newStatus },
                },
            },
        }).catch((err) => console.warn("[toggleStallTypeStatus] Non-critical audit warning:", err));

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleStallTypeStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to toggle status." };
    }
}

/**
 * 6. DELETE STALL TYPE + PRE-DELETION SAFETY + AUDIT SNAPSHOT
 */
export async function deleteStallType(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Stall type ID is required." };
        }

        await verifyBploStallTypesAccess();

        const existing = await (prisma as any).stallType.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Stall type record not found." };
        }

        // Check if there are attached stalls before deleting
        const count = await (prisma as any).stall.count({
            where: { stallTypeId: id },
        });

        if (count > 0) {
            return {
                success: false,
                error: `Cannot delete section "${existing.name}". There are currently ${count} stall unit(s) assigned to it.`,
            };
        }

        await (prisma as any).stallType.delete({
            where: { id },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "StallType",
                entityId: id,
                entityName: `${existing.name} (${existing.code})`,
                description: `Deleted Market Section: "${existing.name}" [${existing.code}]`,
                metadata: {
                    deletedRecordSnapshot: existing,
                },
            });
        } catch (auditErr) {
            console.warn("[deleteStallType] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteStallType] Error:", error);
        return { success: false, error: error?.message || "Failed to delete stall type." };
    }
}
