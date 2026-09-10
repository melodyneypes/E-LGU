"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    otherFees?: {
        name: string;
        amount: number;
        feeType: "DAILY" | "MONTHLY";
        remarks?: string | null;
    }[];
}) {
    try {
        const session = await getServerSession(authOptions);
        const userName = session?.user?.name || session?.user?.email || null;

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
                latitude: data.latitude !== undefined && data.latitude !== null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null,
                longitude: data.longitude !== undefined && data.longitude !== null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null,
                ...(userName && { createdBy: userName, updatedBy: userName }),
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
        });

        revalidatePath("/admin/bplo/stall-registration");
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
        latitude?: number | null;
        longitude?: number | null;
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
        const session = await getServerSession(authOptions);
        const userName = session?.user?.name || session?.user?.email || null;

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
                ...(data.latitude !== undefined && { latitude: data.latitude === null ? null : (isNaN(Number(data.latitude)) ? null : Number(data.latitude)) }),
                ...(data.longitude !== undefined && { longitude: data.longitude === null ? null : (isNaN(Number(data.longitude)) ? null : Number(data.longitude)) }),
                ...(userName && { updatedBy: userName }),
            },
        });

        // Sync stall other fees if provided
        if (data.otherFees !== undefined) {
            await (prisma as any).stallOtherFee.deleteMany({
                where: { stallId: id },
            });

            if (data.otherFees.length > 0) {
                await (prisma as any).stallOtherFee.createMany({
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

        revalidatePath("/admin/bplo/stall-registration");
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

        revalidatePath("/admin/bplo/stall-registration");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete stall:", error);
        return { success: false, error: error.message || "Failed to delete stall" };
    }
}

export async function addStallOtherFee(data: {
    stallId: string;
    name: string;
    amount: number;
    feeType: "DAILY" | "MONTHLY";
    remarks?: string | null;
}) {
    try {
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
        console.error("Failed to add stall fee:", error);
        return { success: false, error: error.message || "Failed to add fee" };
    }
}

export async function deleteStallOtherFee(id: string) {
    try {
        await (prisma as any).stallOtherFee.delete({
            where: { id },
        });

        revalidatePath("/admin/bplo/stall-registration");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete stall fee:", error);
        return { success: false, error: error.message || "Failed to delete fee" };
    }
}

export async function getStallDetails(id: string) {
    try {
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
            return { success: false, error: "Stall not found" };
        }

        return { success: true, data: stall };
    } catch (error: any) {
        console.error("Failed to fetch stall details:", error);
        return { success: false, error: error.message || "Failed to fetch stall details" };
    }
}

