"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

async function verifyAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "STAFF"];
    if (!session?.user || !role || !allowedRoles.includes(role)) {
        throw new Error("Unauthorized: Access denied.");
    }
    return session.user;
}

export async function getCitizenCharters() {
    try {
        const charters = await prisma.citizenCharter.findMany({
            orderBy: { officeName: "asc" }
        });
        return { success: true, data: charters };
    } catch (error: any) {
        console.error("Error fetching charters:", error);
        return { success: false, error: error.message || "Failed to fetch charters" };
    }
}

export async function createCitizenCharter(formData: FormData) {
    try {
        await verifyAdmin();

        const officeName = formData.get("officeName") as string;
        const file = formData.get("file") as File;

        if (!officeName || !officeName.trim()) {
            return { success: false, error: "Office name is required" };
        }

        if (!file || file.size === 0) {
            return { success: false, error: "Document file is required" };
        }

        // Upload to Supabase Storage in system-assets bucket under citizens-charter/
        const fileName = `${Date.now()}_${file.name}`;
        const uploadPath = `citizens-charter/${fileName}`;
        const fileUrl = await uploadFile(file, uploadPath);

        if (!fileUrl) {
            return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
        }

        const charter = await prisma.citizenCharter.create({
            data: {
                officeName: officeName.trim(),
                fileUrl,
                isActive: true
            }
        });

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");

        // Log Citizen Charter Creation
        await logActivity({
            action: "CREATE",
            entityType: "CitizenCharter",
            entityId: charter.id,
            entityName: officeName.trim(),
            description: `Published Citizen's Charter for: "${officeName.trim()}"`,
            metadata: { officeName: officeName.trim() }
        });

        return { success: true, data: charter };
    } catch (error: any) {
        console.error("Error creating charter:", error);
        return { success: false, error: error.message || "Failed to create charter" };
    }
}

export async function updateCitizenCharter(id: string, formData: FormData) {
    try {
        await verifyAdmin();

        const officeName = formData.get("officeName") as string;
        const file = formData.get("file") as File;

        const existing = await prisma.citizenCharter.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Citizen charter not found" };
        }

        let fileUrl = existing.fileUrl;

        // If a new file is uploaded
        if (file && file.size > 0 && file.name !== "undefined") {
            const fileName = `${Date.now()}_${file.name}`;
            const uploadPath = `citizens-charter/${fileName}`;
            const newFileUrl = await uploadFile(file, uploadPath);

            if (!newFileUrl) {
                return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
            }

            fileUrl = newFileUrl;

            // Delete the old file from Supabase storage
            if (existing.fileUrl) {
                try {
                    await deleteFileByUrl(existing.fileUrl);
                } catch (delErr) {
                    console.error("Failed to delete old file:", delErr);
                }
            }
        }

        const updated = await prisma.citizenCharter.update({
            where: { id },
            data: {
                officeName: officeName ? officeName.trim() : existing.officeName,
                fileUrl
            }
        });

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");

        // Log Citizen Charter Update
        await logActivity({
            action: "UPDATE",
            entityType: "CitizenCharter",
            entityId: id,
            entityName: updated.officeName,
            description: `Updated Citizen's Charter for: "${updated.officeName}"`,
            metadata: {
                previousOffice: existing.officeName,
                newOffice: updated.officeName
            }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating charter:", error);
        return { success: false, error: error.message || "Failed to update charter" };
    }
}

export async function toggleCitizenCharterStatus(id: string, isActive: boolean) {
    try {
        await verifyAdmin();

        const updated = await prisma.citizenCharter.update({
            where: { id },
            data: { isActive }
        });

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling charter status:", error);
        return { success: false, error: error.message || "Failed to update status" };
    }
}

export async function deleteCitizenCharter(id: string) {
    try {
        await verifyAdmin();

        const existing = await prisma.citizenCharter.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Citizen charter not found" };
        }

        // Delete from database
        await prisma.citizenCharter.delete({
            where: { id }
        });

        // Delete from storage
        if (existing.fileUrl) {
            try {
                await deleteFileByUrl(existing.fileUrl);
            } catch (delErr) {
                console.error("Failed to delete file from storage:", delErr);
            }
        }

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");

        // Log Citizen Charter Deletion
        await logActivity({
            action: "DELETE",
            entityType: "CitizenCharter",
            entityId: id,
            entityName: existing.officeName,
            description: `Deleted Citizen's Charter for: "${existing.officeName}"`,
            metadata: { officeName: existing.officeName }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting charter:", error);
        return { success: false, error: error.message || "Failed to delete charter" };
    }
}
