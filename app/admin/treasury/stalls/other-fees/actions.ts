"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function createOtherFee(data: {
    code: string;
    name: string;
    amount: number;
    description?: string | null;
}) {
    try {
        const newFee = await (prisma as any).otherFee.create({
            data: {
                code: data.code.trim().toUpperCase(),
                name: data.name.trim(),
                amount: Number(data.amount) || 0,
                description: data.description?.trim() || null,
            },
        });

        revalidatePath("/admin/treasury/stalls/other-fees");
        revalidatePath("/admin/treasury/stalls");
        return { success: true, data: newFee };
    } catch (error: any) {
        console.error("Failed to create other fee:", error);
        return { success: false, error: error.message || "Failed to create fee" };
    }
}

export async function updateOtherFee(
    id: string,
    data: {
        code?: string;
        name?: string;
        amount?: number;
        description?: string | null;
    }
) {
    try {
        const updated = await (prisma as any).otherFee.update({
            where: { id },
            data: {
                ...(data.code && { code: data.code.trim().toUpperCase() }),
                ...(data.name && { name: data.name.trim() }),
                ...(data.amount !== undefined && { amount: Number(data.amount) }),
                description: data.description !== undefined ? data.description?.trim() || null : undefined,
            },
        });

        revalidatePath("/admin/treasury/stalls/other-fees");
        revalidatePath("/admin/treasury/stalls");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update other fee:", error);
        return { success: false, error: error.message || "Failed to update fee" };
    }
}

export async function deleteOtherFee(id: string) {
    try {
        const count = await (prisma as any).stallOtherFee.count({
            where: { otherFeeId: id },
        });

        if (count > 0) {
            return {
                success: false,
                error: `Cannot delete fee. It is currently assigned to ${count} stall(s).`,
            };
        }

        await (prisma as any).otherFee.delete({
            where: { id },
        });

        revalidatePath("/admin/treasury/stalls/other-fees");
        revalidatePath("/admin/treasury/stalls");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete other fee:", error);
        return { success: false, error: error.message || "Failed to delete fee" };
    }
}

export async function assignFeeToStalls(otherFeeId: string, stallIds: string[]) {
    try {
        // Remove old stall assignments for this fee
        await (prisma as any).stallOtherFee.deleteMany({
            where: { otherFeeId },
        });

        // Insert new stall assignments
        if (stallIds.length > 0) {
            const dataToInsert = stallIds.map((stallId) => ({
                stallId,
                otherFeeId,
            }));

            await (prisma as any).stallOtherFee.createMany({
                data: dataToInsert,
            });
        }

        revalidatePath("/admin/treasury/stalls/other-fees");
        revalidatePath("/admin/treasury/stalls");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to assign fee to stalls:", error);
        return { success: false, error: error.message || "Failed to assign fee" };
    }
}
