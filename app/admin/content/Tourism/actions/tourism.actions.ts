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
export async function verifyTourismAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/tourism");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage tourism spots.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * GET SINGLE TOURISM SPOT RECORD BY ID
 */
export async function getTourismById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Tourism spot ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyTourismAccess();

        const spot = await (prisma as any).tourismSpot.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                category: true,
                description: true,
                address: true,
                entranceFee: true,
                bestTimeToVisit: true,
                contactNumber: true,
                imageUrl: true,
                latitude: true,
                longitude: true,
                googleMapsUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!spot) {
            return { success: false, error: "Tourism spot not found." };
        }

        if (isBarangayAdmin && spot.barangay && spot.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot access tourism spots outside your barangay." };
        }

        return { success: true, data: spot, tourismSpot: spot };
    } catch (error: any) {
        console.error("[getTourismById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch tourism spot details." };
    }
}

/**
 * CREATE TOURISM SPOT + STORAGE ROLLBACK + AUDIT LOGGING
 */
export async function createTourismSpot(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyTourismAccess();

        const name = (formData.get("name") as string)?.trim();
        const category = (formData.get("category") as string)?.trim() || "Attraction";
        const description = (formData.get("description") as string)?.trim() || "";
        const address = (formData.get("address") as string)?.trim();
        const entranceFee = (formData.get("entranceFee") as string)?.trim() || null;
        const bestTimeToVisit = (formData.get("bestTimeToVisit") as string)?.trim() || null;
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const googleMapsUrl = (formData.get("googleMapsUrl") as string)?.trim() || null;
        const isPublished = formData.get("isPublished") !== "false";

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        if (!name) {
            return { success: false, error: "Tourism spot name is required." };
        }
        if (!address) {
            return { success: false, error: "Complete address is required." };
        }

        const file = (formData.get("imageFile") || formData.get("image") || formData.get("file")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `tourism-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `tourism/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload photo to storage bucket." };
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        const spot = await (prisma as any).tourismSpot.create({
            data: {
                name,
                category,
                description,
                address,
                entranceFee,
                bestTimeToVisit,
                contactNumber,
                googleMapsUrl,
                imageUrl: finalImageUrl,
                barangay,
                isPublished,
            }
        });

        revalidatePath("/admin/tourism");
        revalidatePath("/tourism");
        revalidatePath("/pasyalan");
        revalidatePath("/");

        // 5. Audit Logging for Creation
        try {
            await logActivity({
                action: "CREATE",
                entityType: "TourismSpot",
                entityId: spot.id,
                entityName: spot.name,
                description: `Created tourism spot: "${spot.name}" in ${spot.barangay || "{{LGU_NAME}}"}`,
                metadata: {
                    name: spot.name,
                    category: spot.category,
                    barangay: spot.barangay,
                    address: spot.address,
                    entranceFee: spot.entranceFee,
                    contactNumber: spot.contactNumber,
                    isPublished: spot.isPublished,
                }
            });
        } catch (auditErr) {
            console.warn("[createTourismSpot] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: spot };
    } catch (error: any) {
        console.error("Error creating tourism spot:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB create failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createTourismSpot] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to create tourism spot." };
    }
}

/**
 * UPDATE TOURISM SPOT + STORAGE ROLLBACK + PHOTO CLEANUP + AUDIT DIFFS
 */
export async function updateTourismSpot(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Tourism spot ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyTourismAccess();

        const existing = await (prisma as any).tourismSpot.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Tourism spot record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify tourism spots outside your barangay." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const category = (formData.get("category") as string)?.trim() || existing.category;
        const description = formData.has("description") ? (formData.get("description") as string)?.trim() || "" : existing.description;
        const address = (formData.get("address") as string)?.trim() || existing.address;
        const entranceFee = formData.has("entranceFee") ? (formData.get("entranceFee") as string)?.trim() || null : existing.entranceFee;
        const bestTimeToVisit = formData.has("bestTimeToVisit") ? (formData.get("bestTimeToVisit") as string)?.trim() || null : existing.bestTimeToVisit;
        const contactNumber = formData.has("contactNumber") ? (formData.get("contactNumber") as string)?.trim() || null : existing.contactNumber;
        const googleMapsUrl = formData.has("googleMapsUrl") ? (formData.get("googleMapsUrl") as string)?.trim() || null : existing.googleMapsUrl;

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
            const filename = `tourism-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `tourism/${filename}`;

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
        } else {
            finalImageUrl = null;
        }

        const updatePayload: Record<string, any> = {
            name,
            category,
            description,
            address,
            entranceFee,
            bestTimeToVisit,
            contactNumber,
            googleMapsUrl,
            imageUrl: finalImageUrl,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updated = await (prisma as any).tourismSpot.update({
            where: { id },
            data: updatePayload
        });

        // 4. STORAGE CLEANUP: Delete old photo if replaced or explicitly removed
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl) {
            try {
                console.log(`[updateTourismSpot] Deleting replaced/removed image: "${oldImageUrl}"`);
                await deleteFileByUrl(oldImageUrl);
            } catch (delErr) {
                console.warn("[updateTourismSpot] Failed to delete old tourism photo from storage bucket:", delErr);
            }
        }

        revalidatePath("/admin/tourism");
        revalidatePath("/tourism");
        revalidatePath("/pasyalan");
        revalidatePath("/");

        // 5. Audit Logging with Structured Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.name !== name) changes["name"] = { old: existing.name, new: name };
            if (existing.category !== category) changes["category"] = { old: existing.category, new: category };
            if (existing.address !== address) changes["address"] = { old: existing.address, new: address };
            if (existing.entranceFee !== entranceFee) changes["entranceFee"] = { old: existing.entranceFee || "None", new: entranceFee || "None" };
            if (existing.bestTimeToVisit !== bestTimeToVisit) changes["bestTimeToVisit"] = { old: existing.bestTimeToVisit || "None", new: bestTimeToVisit || "None" };
            if (existing.contactNumber !== contactNumber) changes["contactNumber"] = { old: existing.contactNumber || "None", new: contactNumber || "None" };
            if (existing.barangay !== barangay) changes["barangay"] = { old: existing.barangay || "None", new: barangay || "None" };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };
            if (updatePayload.isPublished !== undefined && existing.isPublished !== updatePayload.isPublished) {
                changes["isPublished"] = { old: existing.isPublished, new: updatePayload.isPublished };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "TourismSpot",
                entityId: id,
                entityName: updated.name,
                description: `Updated tourism spot: "${updated.name}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    name: updated.name,
                    barangay: updated.barangay
                }
            });
        } catch (auditErr) {
            console.warn("[updateTourismSpot] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating tourism spot:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateTourismSpot] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to update tourism spot." };
    }
}

/**
 * DELETE TOURISM SPOT + PHOTO CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteTourismSpot(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Tourism spot ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyTourismAccess();

        const existing = await (prisma as any).tourismSpot.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Tourism spot record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete tourism spots outside your barangay." };
        }

        // Automatic Photo Cleanup: Delete image from storage bucket if present
        if (existing.imageUrl) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (err) {
                console.warn("Failed to delete tourism photo from bucket:", err);
            }
        }

        await (prisma as any).tourismSpot.delete({
            where: { id }
        });

        revalidatePath("/admin/tourism");
        revalidatePath("/tourism");
        revalidatePath("/pasyalan");
        revalidatePath("/");

        // 5. Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "TourismSpot",
                entityId: id,
                entityName: existing.name,
                description: `Deleted tourism spot: "${existing.name}" (${existing.barangay || "{{LGU_NAME}}"})`,
                metadata: {
                    name: existing.name,
                    category: existing.category,
                    barangay: existing.barangay,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        name: existing.name,
                        category: existing.category,
                        description: existing.description,
                        address: existing.address,
                        entranceFee: existing.entranceFee,
                        bestTimeToVisit: existing.bestTimeToVisit,
                        contactNumber: existing.contactNumber,
                        googleMapsUrl: existing.googleMapsUrl,
                        imageUrl: existing.imageUrl,
                        barangay: existing.barangay,
                        isPublished: existing.isPublished,
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteTourismSpot] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting tourism spot:", error);
        return { success: false, error: error.message || "Failed to delete tourism spot." };
    }
}

/**
 * TOGGLE TOURISM SPOT PUBLISHED STATUS
 */
export async function toggleTourismSpotStatus(id: string, currentStatus: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Tourism spot ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyTourismAccess();

        const existing = await (prisma as any).tourismSpot.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Tourism spot record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify tourism spots outside your barangay." };
        }

        const updated = await (prisma as any).tourismSpot.update({
            where: { id },
            data: { isPublished: !currentStatus }
        });

        revalidatePath("/admin/tourism");
        revalidatePath("/tourism");
        revalidatePath("/pasyalan");
        revalidatePath("/");

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "TourismSpot",
                entityId: id,
                entityName: updated.name,
                description: `Changed tourism spot status for "${updated.name}" to ${updated.isPublished ? "Published" : "Draft"}`,
                metadata: {
                    changes: {
                        isPublished: { old: currentStatus, new: updated.isPublished }
                    },
                    changedFields: ["isPublished"],
                    name: updated.name
                }
            });
        } catch (auditErr) {
            console.warn("[toggleTourismSpotStatus] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling tourism spot status:", error);
        return { success: false, error: error.message || "Failed to update tourism spot status." };
    }
}
