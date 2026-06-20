"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

function getStoragePathFromUrl(url: string): string | null {
    try {
        const parts = url.split("/storage/v1/object/public/system-assets/");
        if (parts.length === 2) {
            return parts[1];
        }
        return null;
    } catch {
        return null;
    }
}

export async function updateResidentProfileImage(imageUrl: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = (session.user as any).id;
        const resident = await prisma.resident.findUnique({
            where: { userId },
            select: { id: true, imageUrl: true }
        });

        if (!resident) {
            return { success: false, error: "Resident profile not found" };
        }

        // Delete the previous profile image from Supabase storage if it exists
        if (resident.imageUrl) {
            const oldPath = getStoragePathFromUrl(resident.imageUrl);
            if (oldPath && supabaseAdmin) {
                try {
                    const { error } = await supabaseAdmin.storage
                        .from("system-assets")
                        .remove([oldPath]);
                    if (error) {
                        console.error("Supabase delete old image error:", error.message);
                    }
                } catch (delError) {
                    console.error("Failed to delete old image file:", delError);
                }
            }
        }

        await prisma.resident.update({
            where: { id: resident.id },
            data: { imageUrl: imageUrl }
        });

        revalidatePath("/user/resident-profile");
        return { success: true, imageUrl };
    } catch (error: any) {
        console.error("Error updating profile image:", error);
        return { success: false, error: error.message || "Failed to update profile image" };
    }
}
