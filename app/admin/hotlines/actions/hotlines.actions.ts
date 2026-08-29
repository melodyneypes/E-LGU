"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), MDRRMO, CONTENT_ADMIN, or custom accessiblePages
 */
export async function verifyHotlineAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isMdrrmo = department === "MDRRMO" || role === "MDRRMO";
    const isContentAdmin = role === "CONTENT_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/hotlines");

    if (!isLguAdmin && !isMdrrmo && !isContentAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage emergency hotlines.");
    }

    return user;
}

/**
 * 2. GET ALL HOTLINES (LEAN QUERY WITH PAGINATION & FILTERING)
 */
export async function getAdminHotlines(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
}) {
    try {
        await verifyHotlineAccess();

        const page = Math.max(1, params?.page || 1);
        const pageSize = Math.max(1, params?.pageSize || 10);
        const skip = (page - 1) * pageSize;

        const whereClause: any = {};

        if (params?.search && params.search.trim()) {
            const query = params.search.trim();
            whereClause.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { mobileNumber: { contains: query, mode: "insensitive" } },
                { telephone: { contains: query, mode: "insensitive" } },
                { address: { contains: query, mode: "insensitive" } },
            ];
        }

        if (params?.category && params.category !== "All") {
            whereClause.category = params.category;
        }

        if (params?.status && params.status !== "All") {
            whereClause.isActive = params.status === "Active";
        }

        const [hotlines, totalCount] = await Promise.all([
            (prisma as any).hotline.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    category: true,
                    mobileNumber: true,
                    telephone: true,
                    address: true,
                    order: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: [{ order: "asc" }, { createdAt: "desc" }],
                skip,
                take: pageSize,
            }),
            (prisma as any).hotline.count({
                where: whereClause,
            }),
        ]);

        return {
            success: true,
            data: hotlines,
            hotlines,
            totalCount,
            page,
            pageSize,
        };
    } catch (error: any) {
        console.error("[getAdminHotlines] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch emergency hotlines." };
    }
}

/**
 * 3. GET HOTLINE BY ID (FAST MODAL SYNC)
 */
export async function getHotlineById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Hotline ID is required." };
        }

        await verifyHotlineAccess();

        const hotline = await (prisma as any).hotline.findUnique({
            where: { id },
        });

        if (!hotline) {
            return { success: false, error: "Hotline record not found." };
        }

        return { success: true, data: hotline, hotline };
    } catch (error: any) {
        console.error("[getHotlineById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch hotline record." };
    }
}

/**
 * 4. ADD EMERGENCY HOTLINE + AUDIT LOGGING
 */
export async function addHotline(formData: FormData) {
    try {
        await verifyHotlineAccess();

        const name = (formData.get("name") as string)?.trim();
        const category = (formData.get("category") as string)?.trim() || "Emergency";
        const mobileNumber = (formData.get("mobileNumber") as string)?.trim() || null;
        const telephone = (formData.get("telephone") as string)?.trim() || null;
        const address = (formData.get("address") as string)?.trim() || null;

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;
        const order = isNaN(parsedOrder) ? 0 : parsedOrder;

        if (!name) {
            return { success: false, error: "Hotline name/organization is required." };
        }

        const newHotline = await (prisma as any).hotline.create({
            data: {
                name,
                category,
                mobileNumber,
                telephone,
                address,
                order,
                isActive: true,
            },
        });

        revalidatePath("/");
        revalidatePath("/admin/hotlines");
        revalidatePath("/emergency");
        revalidatePath("/hotlines");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Hotline",
                entityId: newHotline.id,
                entityName: name,
                description: `Added emergency hotline: "${name}" (${category})`,
                metadata: {
                    name,
                    category,
                    mobileNumber: mobileNumber || "None",
                    telephone: telephone || "None",
                    address: address || "None",
                    order,
                },
            });
        } catch (auditErr) {
            console.warn("[addHotline] Audit log warning:", auditErr);
        }

        return { success: true, data: newHotline, hotline: newHotline };
    } catch (error: any) {
        console.error("[addHotline] Error:", error);
        return { success: false, error: error?.message || "Failed to create emergency hotline." };
    }
}

/**
 * 5. UPDATE EMERGENCY HOTLINE + PRECISE AUDIT DIFFS
 */
export async function updateHotline(id: string, formData: FormData) {
    try {
        if (!id) {
            return { success: false, error: "Hotline ID is required." };
        }

        await verifyHotlineAccess();

        const existing = await (prisma as any).hotline.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Hotline record not found." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const category = (formData.get("category") as string)?.trim() || existing.category;
        const mobileNumber = (formData.get("mobileNumber") as string)?.trim() || null;
        const telephone = (formData.get("telephone") as string)?.trim() || null;
        const address = (formData.get("address") as string)?.trim() || null;

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : existing.order;
        const order = isNaN(parsedOrder) ? existing.order : parsedOrder;

        const updatedHotline = await (prisma as any).hotline.update({
            where: { id },
            data: {
                name,
                category,
                mobileNumber,
                telephone,
                address,
                order,
            },
        });

        revalidatePath("/");
        revalidatePath("/admin/hotlines");
        revalidatePath("/emergency");
        revalidatePath("/hotlines");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if ((existing.name || "") !== (name || "")) changes["name"] = { old: existing.name, new: name };
            if ((existing.category || "") !== (category || "")) changes["category"] = { old: existing.category, new: category };
            if ((existing.mobileNumber || "") !== (mobileNumber || "")) changes["mobileNumber"] = { old: existing.mobileNumber || "None", new: mobileNumber || "None" };
            if ((existing.telephone || "") !== (telephone || "")) changes["telephone"] = { old: existing.telephone || "None", new: telephone || "None" };
            if ((existing.address || "") !== (address || "")) changes["address"] = { old: existing.address || "None", new: address || "None" };
            if (existing.order !== order) changes["order"] = { old: existing.order, new: order };

            const modifiedFieldNames = Object.keys(changes);
            const descriptionSummary = modifiedFieldNames.length > 0
                ? `Updated emergency hotline "${updatedHotline.name}" (Modified: ${modifiedFieldNames.join(", ")})`
                : `Updated emergency hotline "${updatedHotline.name}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "Hotline",
                entityId: id,
                entityName: updatedHotline.name,
                description: descriptionSummary,
                metadata: {
                    name: updatedHotline.name,
                    changes,
                    previousName: existing.name,
                },
            });
        } catch (auditErr) {
            console.warn("[updateHotline] Audit log warning:", auditErr);
        }

        return { success: true, data: updatedHotline, hotline: updatedHotline };
    } catch (error: any) {
        console.error("[updateHotline] Error:", error);
        return { success: false, error: error?.message || "Failed to update emergency hotline." };
    }
}

/**
 * 6. TOGGLE HOTLINE ACTIVE STATUS + AUDIT LOGGING
 */
export async function toggleHotlineStatus(id: string, isActive: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Hotline ID is required." };
        }

        await verifyHotlineAccess();

        const existing = await (prisma as any).hotline.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Hotline record not found." };
        }

        const updated = await (prisma as any).hotline.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath("/admin/hotlines");
        revalidatePath("/emergency");
        revalidatePath("/hotlines");

        // Audit Logging
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Hotline",
                entityId: id,
                entityName: existing.name,
                description: `Changed status of emergency hotline "${existing.name}" to ${isActive ? "Active" : "Inactive"}`,
                metadata: {
                    name: existing.name,
                    changes: { isActive: { old: existing.isActive, new: isActive } },
                },
            });
        } catch (auditErr) {
            console.warn("[toggleHotlineStatus] Audit log warning:", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleHotlineStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to update hotline status." };
    }
}

/**
 * 7. DELETE EMERGENCY HOTLINE + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteHotline(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Hotline ID is required." };
        }

        await verifyHotlineAccess();

        const existing = await (prisma as any).hotline.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Hotline record not found." };
        }

        await (prisma as any).hotline.delete({
            where: { id },
        });

        revalidatePath("/");
        revalidatePath("/admin/hotlines");
        revalidatePath("/emergency");
        revalidatePath("/hotlines");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Hotline",
                entityId: id,
                entityName: existing.name,
                description: `Deleted emergency hotline: "${existing.name}" (${existing.category})`,
                metadata: {
                    deletedRecordSnapshot: existing,
                },
            });
        } catch (auditErr) {
            console.warn("[deleteHotline] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteHotline] Error:", error);
        return { success: false, error: error?.message || "Failed to delete emergency hotline." };
    }
}
