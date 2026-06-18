"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function updateResidentProfileImage(imageUrl: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = (session.user as any).id;
        const resident = await prisma.resident.findUnique({
            where: { userId },
            select: { id: true }
        });

        if (!resident) {
            return { success: false, error: "Resident profile not found" };
        }

        await prisma.resident.update({
            where: { id: resident.id },
            data: { livenessUrl: imageUrl }
        });

        revalidatePath("/user/resident-profile");
        return { success: true, imageUrl };
    } catch (error: any) {
        console.error("Error updating profile image:", error);
        return { success: false, error: error.message || "Failed to update profile image" };
    }
}
