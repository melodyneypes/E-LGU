"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function createStallType(data: {
    code: string;
    name: string;
    description?: string | null;
}) {
    try {
        const newStallType = await (prisma as any).stallType.create({
            data: {
                code: data.code.trim().toUpperCase(),
                name: data.name.trim(),
                description: data.description?.trim() || null,
            },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");
        return { success: true, data: newStallType };
    } catch (error: any) {
        console.error("Failed to create stall type:", error);
        return { success: false, error: error.message || "Failed to create stall type" };
    }
}

export async function updateStallType(
    id: string,
    data: {
        code?: string;
        name?: string;
        description?: string | null;
    }
) {
    try {
        const updated = await (prisma as any).stallType.update({
            where: { id },
            data: {
                ...(data.code && { code: data.code.trim().toUpperCase() }),
                ...(data.name && { name: data.name.trim() }),
                description: data.description !== undefined ? data.description?.trim() || null : undefined,
            },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update stall type:", error);
        return { success: false, error: error.message || "Failed to update stall type" };
    }
}

export async function deleteStallType(id: string) {
    try {
        // Check if there are attached stalls before deleting
        const count = await (prisma as any).stall.count({
            where: { stallTypeId: id },
        });

        if (count > 0) {
            return {
                success: false,
                error: `Cannot delete section. There are currently ${count} stall(s) assigned to it.`,
            };
        }

        await (prisma as any).stallType.delete({
            where: { id },
        });

        revalidatePath("/admin/bplo/stall-registration/types");
        revalidatePath("/admin/bplo/stall-registration");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete stall type:", error);
        return { success: false, error: error.message || "Failed to delete stall type" };
    }
}
