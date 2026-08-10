"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function issueStallTicket(data: {
    stallId: string;
    collectorId: string;
    ticketNumber: string;
    baseAmount: number;
    otherFeesPaid: number;
    overdueFeePaid: number;
    paymentMethod: "CASH" | "EPAYMENT";
    remarks?: string | null;
}) {
    try {
        // Fetch stall to get vendorId
        const stall = await (prisma as any).stall.findUnique({
            where: { id: data.stallId },
            select: { id: true, vendorId: true },
        });

        if (!stall) {
            return { success: false, error: "Stall not found" };
        }

        const totalAmountPaid =
            (Number(data.baseAmount) || 0) +
            (Number(data.otherFeesPaid) || 0) +
            (Number(data.overdueFeePaid) || 0);

        const newCollection = await (prisma as any).stallCollection.create({
            data: {
                stallId: data.stallId,
                vendorId: stall.vendorId || null,
                collectorId: data.collectorId,
                ticketNumber: data.ticketNumber.trim(),
                baseAmount: Number(data.baseAmount) || 0,
                otherFeesPaid: Number(data.otherFeesPaid) || 0,
                overdueFeePaid: Number(data.overdueFeePaid) || 0,
                totalAmountPaid,
                paymentMethod: data.paymentMethod,
                status: "PAID",
                remarks: data.remarks || null,
            },
        });

        revalidatePath("/admin/treasury/stalls/collections");
        return { success: true, data: newCollection };
    } catch (error: any) {
        console.error("Failed to issue stall ticket:", error);
        return { success: false, error: error.message || "Failed to issue ticket" };
    }
}

export async function cancelStallTicket(id: string) {
    try {
        await (prisma as any).stallCollection.update({
            where: { id },
            data: { status: "CANCELLED" },
        });

        revalidatePath("/admin/treasury/stalls/collections");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to cancel ticket:", error);
        return { success: false, error: error.message || "Failed to cancel ticket" };
    }
}
