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
export async function verifyBploStallsAccess(): Promise<SessionUser> {
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
    const hasPageAccess = accessiblePages.includes("/admin/bplo/stall-registration") || accessiblePages.includes("/admin/bplo");

    if (isTreasury || (!isLguAdmin && !isBplo && !hasPageAccess)) {
        throw new Error("Forbidden: You do not have permissions to manage Market Stall Registration.");
    }

    return user;
}

/**
 * 2. GET STALL DETAILS BY ID (FAST MODAL SYNC)
 */
export async function getStallDetails(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Stall ID is required." };
        }

        await verifyBploStallsAccess();

        const stall = await (prisma as any).stall.findUnique({
            where: { id },
            select: {
                id: true,
                stallNumber: true,
                stallTypeId: true,
                vendorId: true,
                status: true,
                dailyRate: true,
                monthlyRate: true,
                dailyRateOverdueFee: true,
                monthlyRateOverdueFee: true,
                latitude: true,
                longitude: true,
                address: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                updatedBy: true,
                stallType: { select: { id: true, code: true, name: true } },
                vendor: { select: { id: true, name: true, email: true } },
                otherFees: true,
            },
        });

        if (!stall) {
            return { success: false, error: "Stall not found." };
        }

        return { success: true, data: stall, stall };
    } catch (error: any) {
        console.error("[getStallDetails] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch stall details." };
    }
}

/**
 * 3. CREATE STALL + ATTACHED FEES + AUDIT LOGGING
 */
export async function createStall(data: {
    stallNumber: string;
    stallTypeId: string;
    vendorId?: string | null;
    status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
    dailyRate: number;
    monthlyRate: number;
    dailyRateOverdueFee: number;
    monthlyRateOverdueFee: number;
    imageUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    otherFees?: {
        name: string;
        amount: number;
        feeType: "DAILY" | "MONTHLY";
        remarks?: string | null;
    }[];
}) {
    const stallNumber = data.stallNumber?.trim() || "";

    try {
        const user = await verifyBploStallsAccess();
        const userName = user.name || user.email || "System";

        if (!stallNumber) {
            return { success: false, error: "Stall unit number is required." };
        }
        if (!data.stallTypeId) {
            return { success: false, error: "Stall section/type is required." };
        }

        // Duplicate stall number pre-check
        const existingStall = await (prisma as any).stall.findUnique({
            where: { stallNumber },
            select: { id: true, stallNumber: true },
        });

        if (existingStall) {
            return {
                success: false,
                error: `Market Stall "${stallNumber}" already exists. Please choose a different stall number.`,
            };
        }

        const newStall = await (prisma as any).stall.create({
            data: {
                stallNumber,
                stallTypeId: data.stallTypeId,
                vendorId: data.vendorId || null,
                status: data.status,
                dailyRate: Number(data.dailyRate) || 0,
                monthlyRate: Number(data.monthlyRate) || 0,
                dailyRateOverdueFee: Number(data.dailyRateOverdueFee) || 0,
                monthlyRateOverdueFee: Number(data.monthlyRateOverdueFee) || 0,
                latitude: data.latitude !== undefined && data.latitude !== null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null,
                longitude: data.longitude !== undefined && data.longitude !== null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null,
                address: data.address ? data.address.trim() : null,
                createdBy: userName,
                updatedBy: userName,
                ...(data.otherFees && data.otherFees.length > 0 && {
                    otherFees: {
                        create: data.otherFees.map((fee) => ({
                            name: fee.name.trim(),
                            amount: Number(fee.amount) || 0,
                            feeType: fee.feeType,
                            remarks: fee.remarks ? fee.remarks.trim() : null,
                        })),
                    },
                }),
            },
            include: {
                stallType: { select: { name: true } },
                vendor: { select: { name: true } },
            },
        });

        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/registry");
        revalidatePath("/admin/treasury/collections");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Stall",
                entityId: newStall.id,
                entityName: `Stall ${stallNumber}`,
                description: `Created Market Stall "${stallNumber}" (${newStall.stallType?.name || "Standard"}, Status: ${data.status})`,
                metadata: {
                    stallNumber,
                    stallType: newStall.stallType?.name,
                    status: data.status,
                    dailyRate: data.dailyRate,
                    monthlyRate: data.monthlyRate,
                    vendor: newStall.vendor?.name || "None",
                    otherFeesCount: data.otherFees?.length || 0,
                },
            });
        } catch (auditErr) {
            console.warn("[createStall] Audit log warning:", auditErr);
        }

        return { success: true, data: newStall, stall: newStall };
    } catch (error: any) {
        console.error("[createStall] Error:", error);
        if (error?.code === "P2002") {
            return {
                success: false,
                error: `Market Stall "${stallNumber}" already exists. Please choose a different stall number.`,
            };
        }
        return { success: false, error: error?.message || "Failed to create stall." };
    }
}

/**
 * 4. UPDATE STALL + SYNC FEES (TRANSACTION ROLLBACK) + PRECISE AUDIT DIFFS
 */
export async function updateStall(
    id: string,
    data: {
        stallNumber?: string;
        stallTypeId?: string;
        vendorId?: string | null;
        status?: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
        dailyRate?: number;
        monthlyRate?: number;
        dailyRateOverdueFee?: number;
        monthlyRateOverdueFee?: number;
        latitude?: number | null;
        longitude?: number | null;
        address?: string | null;
        otherFees?: {
            id?: string;
            name: string;
            amount: number;
            feeType: "DAILY" | "MONTHLY";
            remarks?: string | null;
        }[];
    }
) {
    try {
        if (!id) {
            return { success: false, error: "Stall ID is required." };
        }

        const user = await verifyBploStallsAccess();
        const userName = user.name || user.email || "System";

        const existing = await (prisma as any).stall.findUnique({
            where: { id },
            include: {
                stallType: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } },
                otherFees: true,
            },
        });

        if (!existing) {
            return { success: false, error: "Stall record not found." };
        }

        const updatedStallNumber = data.stallNumber ? data.stallNumber.trim() : existing.stallNumber;

        // Check if new stallNumber is taken by another stall
        if (data.stallNumber && updatedStallNumber !== existing.stallNumber) {
            const conflict = await (prisma as any).stall.findUnique({
                where: { stallNumber: updatedStallNumber },
                select: { id: true },
            });
            if (conflict && conflict.id !== id) {
                return {
                    success: false,
                    error: `Market Stall "${updatedStallNumber}" is already in use by another unit.`,
                };
            }
        }

        // Perform atomic update with prisma.$transaction for rollback safety
        const updated = await (prisma as any).$transaction(async (tx: any) => {
            const stallRecord = await tx.stall.update({
                where: { id },
                data: {
                    ...(data.stallNumber && { stallNumber: updatedStallNumber }),
                    ...(data.stallTypeId && { stallTypeId: data.stallTypeId }),
                    vendorId: data.vendorId !== undefined ? (data.vendorId === "NONE" ? null : data.vendorId) : existing.vendorId,
                    ...(data.status && { status: data.status }),
                    ...(data.dailyRate !== undefined && { dailyRate: Number(data.dailyRate) }),
                    ...(data.monthlyRate !== undefined && { monthlyRate: Number(data.monthlyRate) }),
                    ...(data.dailyRateOverdueFee !== undefined && { dailyRateOverdueFee: Number(data.dailyRateOverdueFee) }),
                    ...(data.monthlyRateOverdueFee !== undefined && { monthlyRateOverdueFee: Number(data.monthlyRateOverdueFee) }),
                    ...(data.latitude !== undefined && { latitude: data.latitude === null ? null : (isNaN(Number(data.latitude)) ? null : Number(data.latitude)) }),
                    ...(data.longitude !== undefined && { longitude: data.longitude === null ? null : (isNaN(Number(data.longitude)) ? null : Number(data.longitude)) }),
                    ...(data.address !== undefined && { address: data.address ? data.address.trim() : null }),
                    updatedBy: userName,
                },
                include: {
                    stallType: { select: { id: true, name: true } },
                    vendor: { select: { id: true, name: true } },
                },
            });

            // Sync stall other fees if provided
            if (data.otherFees !== undefined) {
                await tx.stallOtherFee.deleteMany({
                    where: { stallId: id },
                });

                if (data.otherFees.length > 0) {
                    await tx.stallOtherFee.createMany({
                        data: data.otherFees.map((fee) => ({
                            stallId: id,
                            name: fee.name.trim(),
                            amount: Number(fee.amount) || 0,
                            feeType: fee.feeType,
                            remarks: fee.remarks ? fee.remarks.trim() : null,
                        })),
                    });
                }
            }

            return stallRecord;
        });

        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/registry");
        revalidatePath("/admin/treasury/collections");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};

            if (existing.stallNumber !== updatedStallNumber) {
                changes["stallNumber"] = { old: existing.stallNumber, new: updatedStallNumber };
            }
            if (data.status && existing.status !== data.status) {
                changes["status"] = { old: existing.status, new: data.status };
            }
            if (data.dailyRate !== undefined && existing.dailyRate !== Number(data.dailyRate)) {
                changes["dailyRate"] = { old: existing.dailyRate, new: Number(data.dailyRate) };
            }
            if (data.monthlyRate !== undefined && existing.monthlyRate !== Number(data.monthlyRate)) {
                changes["monthlyRate"] = { old: existing.monthlyRate, new: Number(data.monthlyRate) };
            }
            if (data.stallTypeId && existing.stallTypeId !== data.stallTypeId) {
                changes["stallType"] = { old: existing.stallType?.name, new: updated.stallType?.name };
            }
            if (data.vendorId !== undefined && existing.vendorId !== (data.vendorId === "NONE" ? null : data.vendorId)) {
                changes["vendor"] = { old: existing.vendor?.name || "None", new: updated.vendor?.name || "None" };
            }
            // Format other fees into clean readable strings: "Garbage Fee (₱5 / MONTHLY)"
            if (data.otherFees !== undefined) {
                const formatFeeList = (fees: any[]) => {
                    if (!fees || fees.length === 0) return "None";
                    return fees.map((f) => `${f.name}: ₱${Number(f.amount || 0).toLocaleString()} (${f.feeType || "DAILY"})`).join(", ");
                };

                const oldFeesFormatted = formatFeeList(existing.otherFees || []);
                const newFeesFormatted = formatFeeList(data.otherFees || []);

                if (oldFeesFormatted !== newFeesFormatted) {
                    changes["otherFees"] = { old: oldFeesFormatted, new: newFeesFormatted };
                }
            }

            const modifiedFields = Object.keys(changes);
            const desc = modifiedFields.length > 0
                ? `Updated Stall "${updated.stallNumber}" (Modified: ${modifiedFields.join(", ")})`
                : `Updated Stall "${updated.stallNumber}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "Stall",
                entityId: id,
                entityName: `Stall ${updated.stallNumber}`,
                description: desc,
                metadata: {
                    stallNumber: updated.stallNumber,
                    changes,
                    previousSnapshot: {
                        stallNumber: existing.stallNumber,
                        status: existing.status,
                        dailyRate: existing.dailyRate,
                        monthlyRate: existing.monthlyRate,
                    },
                },
            });
        } catch (auditErr) {
            console.warn("[updateStall] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, stall: updated };
    } catch (error: any) {
        console.error("[updateStall] Error:", error);
        return { success: false, error: error?.message || "Failed to update stall." };
    }
}

/**
 * 5. DELETE STALL + CLEANUP + AUDIT SNAPSHOT
 */
export async function deleteStall(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Stall ID is required." };
        }

        await verifyBploStallsAccess();

        const existing = await (prisma as any).stall.findUnique({
            where: { id },
            include: {
                stallType: { select: { name: true } },
                vendor: { select: { name: true } },
                otherFees: true,
            },
        });

        if (!existing) {
            return { success: false, error: "Stall record not found." };
        }

        // Atomic delete of fees and stall record
        await (prisma as any).$transaction(async (tx: any) => {
            await tx.stallOtherFee.deleteMany({
                where: { stallId: id },
            });

            await tx.stall.delete({
                where: { id },
            });
        });

        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/registry");
        revalidatePath("/admin/treasury/collections");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Stall",
                entityId: id,
                entityName: `Stall ${existing.stallNumber}`,
                description: `Deleted Market Stall "${existing.stallNumber}" (Section: ${existing.stallType?.name || "Standard"})`,
                metadata: {
                    deletedRecordSnapshot: existing,
                },
            });
        } catch (auditErr) {
            console.warn("[deleteStall] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteStall] Error:", error);
        return { success: false, error: error?.message || "Failed to delete stall." };
    }
}

/**
 * 6. ADD STALL OTHER FEE
 */
export async function addStallOtherFee(data: {
    stallId: string;
    name: string;
    amount: number;
    feeType: "DAILY" | "MONTHLY";
    remarks?: string | null;
}) {
    try {
        await verifyBploStallsAccess();

        const newFee = await (prisma as any).stallOtherFee.create({
            data: {
                stallId: data.stallId,
                name: data.name.trim(),
                amount: Number(data.amount) || 0,
                feeType: data.feeType,
                remarks: data.remarks?.trim() || null,
            },
        });

        revalidatePath("/admin/bplo/stall-registration");
        return { success: true, data: newFee };
    } catch (error: any) {
        console.error("[addStallOtherFee] Error:", error);
        return { success: false, error: error?.message || "Failed to add stall fee." };
    }
}

/**
 * 7. DELETE STALL OTHER FEE
 */
export async function deleteStallOtherFee(id: string) {
    try {
        await verifyBploStallsAccess();

        await (prisma as any).stallOtherFee.delete({
            where: { id },
        });

        revalidatePath("/admin/bplo/stall-registration");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteStallOtherFee] Error:", error);
        return { success: false, error: error?.message || "Failed to delete stall fee." };
    }
}
