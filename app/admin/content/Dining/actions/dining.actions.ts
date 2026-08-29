"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    managedBarangay?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role checking: ADMIN (LGU), CONTENT_ADMIN, BARANGAY_ADMIN, or custom accessiblePages
 */
export async function verifyDiningAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isContentAdmin = role === "CONTENT_ADMIN";
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/dining");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage dining places.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * GET SINGLE DINING RECORD BY ID
 */
export async function getDiningById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Dining ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyDiningAccess();

        const dining = await (prisma as any).dining.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                description: true,
                cuisineType: true,
                address: true,
                googleMapsUrl: true,
                contactNumber: true,
                facebookUrl: true,
                openingHours: true,
                imageUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!dining) {
            return { success: false, error: "Dining place not found." };
        }

        if (isBarangayAdmin && dining.barangay && dining.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot access dining places outside your barangay." };
        }

        return { success: true, data: dining, dining };
    } catch (error: any) {
        console.error("[getDiningById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch dining details." };
    }
}

/**
 * CREATE DINING RECORD + STORAGE ROLLBACK + AUDIT LOGGING
 */
export async function createDining(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyDiningAccess();

        const name = (formData.get("name") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || "";
        const cuisineType = (formData.get("cuisineType") as string)?.trim() || null;
        const address = (formData.get("address") as string)?.trim();
        const googleMapsUrl = (formData.get("googleMapsUrl") as string)?.trim() || null;
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const facebookUrl = (formData.get("facebookUrl") as string)?.trim() || null;
        const openingHours = (formData.get("openingHours") as string)?.trim() || null;
        const isPublished = formData.get("isPublished") !== "false";

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        if (!name) {
            return { success: false, error: "Dining place name is required." };
        }
        if (!address) {
            return { success: false, error: "Complete address is required." };
        }

        const file = (formData.get("imageFile") || formData.get("image") || formData.get("file")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `dining-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `dining/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload photo to storage bucket." };
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        const dining = await (prisma as any).dining.create({
            data: {
                name,
                description,
                cuisineType,
                address,
                googleMapsUrl,
                contactNumber,
                facebookUrl,
                openingHours,
                imageUrl: finalImageUrl,
                barangay,
                isPublished,
            }
        });

        revalidatePath("/admin/dining");
        revalidatePath("/kainan");
        revalidatePath("/");

        // 5. Audit Logging for Creation
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Dining",
                entityId: dining.id,
                entityName: dining.name,
                description: `Created dining listing: "${dining.name}" in ${dining.barangay || "Mapandan"}`,
                metadata: {
                    name: dining.name,
                    cuisineType: dining.cuisineType,
                    barangay: dining.barangay,
                    address: dining.address,
                    contactNumber: dining.contactNumber,
                    isPublished: dining.isPublished,
                }
            });
        } catch (auditErr) {
            console.warn("[createDining] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: dining };
    } catch (error: any) {
        console.error("Error creating dining listing:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB create failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createDining] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to create dining listing." };
    }
}

/**
 * UPDATE DINING RECORD + STORAGE ROLLBACK + PHOTO CLEANUP + AUDIT DIFFS
 */
export async function updateDining(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Dining ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyDiningAccess();

        const existing = await (prisma as any).dining.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Dining record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify dining places outside your barangay." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const description = formData.has("description") ? (formData.get("description") as string)?.trim() || "" : existing.description;
        const cuisineType = formData.has("cuisineType") ? (formData.get("cuisineType") as string)?.trim() || null : existing.cuisineType;
        const address = (formData.get("address") as string)?.trim() || existing.address;
        const googleMapsUrl = formData.has("googleMapsUrl") ? (formData.get("googleMapsUrl") as string)?.trim() || null : existing.googleMapsUrl;
        const contactNumber = formData.has("contactNumber") ? (formData.get("contactNumber") as string)?.trim() || null : existing.contactNumber;
        const facebookUrl = formData.has("facebookUrl") ? (formData.get("facebookUrl") as string)?.trim() || null : existing.facebookUrl;
        const openingHours = formData.has("openingHours") ? (formData.get("openingHours") as string)?.trim() || null : existing.openingHours;

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        } else if (!barangay) {
            barangay = existing.barangay;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        const isImageRemoved = formData.get("imageRemoved") === "true";
        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;

        const file = (formData.get("imageFile") || formData.get("image") || formData.get("file")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `dining-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `dining/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload updated photo to storage bucket." };
            }
        }

        let finalImageUrl: string | null = existing.imageUrl || null;
        if (newlyUploadedUrl) {
            finalImageUrl = newlyUploadedUrl;
        } else if (isImageRemoved) {
            finalImageUrl = null;
        } else if (formData.has("imageUrl")) {
            finalImageUrl = rawImageUrl || null;
        }

        const updatePayload: Record<string, any> = {
            name,
            description,
            cuisineType,
            address,
            googleMapsUrl,
            contactNumber,
            facebookUrl,
            openingHours,
            imageUrl: finalImageUrl,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updated = await (prisma as any).dining.update({
            where: { id },
            data: updatePayload
        });

        // 4. STORAGE CLEANUP: Delete old photo if replaced or explicitly removed
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl) {
            try {
                await deleteFileByUrl(oldImageUrl);
            } catch (delErr) {
                console.warn("Failed to delete old dining photo from storage bucket:", delErr);
            }
        }

        revalidatePath("/admin/dining");
        revalidatePath("/kainan");
        revalidatePath("/");

        // 5. Audit Logging with Structured Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.name !== name) changes["name"] = { old: existing.name, new: name };
            if (existing.cuisineType !== cuisineType) changes["cuisineType"] = { old: existing.cuisineType || "None", new: cuisineType || "None" };
            if (existing.address !== address) changes["address"] = { old: existing.address, new: address };
            if (existing.contactNumber !== contactNumber) changes["contactNumber"] = { old: existing.contactNumber || "None", new: contactNumber || "None" };
            if (existing.openingHours !== openingHours) changes["openingHours"] = { old: existing.openingHours || "None", new: openingHours || "None" };
            if (existing.barangay !== barangay) changes["barangay"] = { old: existing.barangay || "None", new: barangay || "None" };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };
            if (updatePayload.isPublished !== undefined && existing.isPublished !== updatePayload.isPublished) {
                changes["isPublished"] = { old: existing.isPublished, new: updatePayload.isPublished };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "Dining",
                entityId: id,
                entityName: updated.name,
                description: `Updated dining listing: "${updated.name}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    name: updated.name,
                    barangay: updated.barangay
                }
            });
        } catch (auditErr) {
            console.warn("[updateDining] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating dining listing:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateDining] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to update dining listing." };
    }
}

/**
 * DELETE DINING RECORD + PHOTO CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteDining(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Dining ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyDiningAccess();

        const existing = await (prisma as any).dining.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Dining record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete dining places outside your barangay." };
        }

        // Automatic Photo Cleanup: Delete image from storage bucket if present
        if (existing.imageUrl && existing.imageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (err) {
                console.warn("Failed to delete dining photo from bucket:", err);
            }
        }

        await (prisma as any).dining.delete({
            where: { id }
        });

        revalidatePath("/admin/dining");
        revalidatePath("/kainan");
        revalidatePath("/");

        // 5. Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Dining",
                entityId: id,
                entityName: existing.name,
                description: `Deleted dining listing: "${existing.name}" (${existing.barangay || "Mapandan"})`,
                metadata: {
                    name: existing.name,
                    cuisineType: existing.cuisineType,
                    barangay: existing.barangay,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        name: existing.name,
                        description: existing.description,
                        cuisineType: existing.cuisineType,
                        address: existing.address,
                        googleMapsUrl: existing.googleMapsUrl,
                        contactNumber: existing.contactNumber,
                        facebookUrl: existing.facebookUrl,
                        openingHours: existing.openingHours,
                        imageUrl: existing.imageUrl,
                        barangay: existing.barangay,
                        isPublished: existing.isPublished,
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteDining] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting dining listing:", error);
        return { success: false, error: error.message || "Failed to delete dining listing." };
    }
}

/**
 * TOGGLE DINING PUBLISHED STATUS
 */
export async function toggleDiningStatus(id: string, currentStatus: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Dining ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyDiningAccess();

        const existing = await (prisma as any).dining.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Dining record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify dining places outside your barangay." };
        }

        const updated = await (prisma as any).dining.update({
            where: { id },
            data: { isPublished: !currentStatus }
        });

        revalidatePath("/admin/dining");
        revalidatePath("/kainan");
        revalidatePath("/");

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Dining",
                entityId: id,
                entityName: updated.name,
                description: `Changed dining status for "${updated.name}" to ${updated.isPublished ? "Published" : "Draft"}`,
                metadata: {
                    changes: {
                        isPublished: { old: currentStatus, new: updated.isPublished }
                    },
                    changedFields: ["isPublished"],
                    name: updated.name
                }
            });
        } catch (auditErr) {
            console.warn("[toggleDiningStatus] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling dining status:", error);
        return { success: false, error: error.message || "Failed to update dining status." };
    }
}
