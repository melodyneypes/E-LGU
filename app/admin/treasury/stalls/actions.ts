"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

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
}) {
    try {
        const newStall = await (prisma as any).stall.create({
            data: {
                stallNumber: data.stallNumber.trim(),
                stallTypeId: data.stallTypeId,
                vendorId: data.vendorId || null,
                status: data.status,
                dailyRate: Number(data.dailyRate) || 0,
                monthlyRate: Number(data.monthlyRate) || 0,
                dailyRateOverdueFee: Number(data.dailyRateOverdueFee) || 0,
                monthlyRateOverdueFee: Number(data.monthlyRateOverdueFee) || 0,
            },
        });

        revalidatePath("/admin/treasury/stalls");
        return { success: true, data: newStall };
    } catch (error: any) {
        console.error("Failed to create stall:", error);
        return { success: false, error: error.message || "Failed to create stall" };
    }
}

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
    }
) {
    try {
        const updated = await (prisma as any).stall.update({
            where: { id },
            data: {
                ...(data.stallNumber && { stallNumber: data.stallNumber.trim() }),
                ...(data.stallTypeId && { stallTypeId: data.stallTypeId }),
                vendorId: data.vendorId !== undefined ? data.vendorId : undefined,
                ...(data.status && { status: data.status }),
                ...(data.dailyRate !== undefined && { dailyRate: Number(data.dailyRate) }),
                ...(data.monthlyRate !== undefined && { monthlyRate: Number(data.monthlyRate) }),
                ...(data.dailyRateOverdueFee !== undefined && { dailyRateOverdueFee: Number(data.dailyRateOverdueFee) }),
                ...(data.monthlyRateOverdueFee !== undefined && { monthlyRateOverdueFee: Number(data.monthlyRateOverdueFee) }),
            },
        });

        revalidatePath("/admin/treasury/stalls");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update stall:", error);
        return { success: false, error: error.message || "Failed to update stall" };
    }
}

export async function deleteStall(id: string) {
    try {
        await (prisma as any).stall.delete({
            where: { id },
        });

        revalidatePath("/admin/treasury/stalls");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete stall:", error);
        return { success: false, error: error.message || "Failed to delete stall" };
    }
}
