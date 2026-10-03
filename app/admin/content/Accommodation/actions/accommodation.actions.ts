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
export async function verifyAccommodationAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/accommodation");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage accommodations.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * GET SINGLE ACCOMMODATION RECORD BY ID
 */
export async function getAccommodationById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Accommodation ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyAccommodationAccess();

        const accommodation = await (prisma as any).accommodation.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                type: true,
                description: true,
                address: true,
                priceRange: true,
                contactNumber: true,
                websiteUrl: true,
                googleMapsUrl: true,
                amenities: true,
                imageUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!accommodation) {
            return { success: false, error: "Accommodation place not found." };
        }

        if (isBarangayAdmin && accommodation.barangay && accommodation.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot access accommodations outside your barangay." };
        }

        return { success: true, data: accommodation, accommodation };
    } catch (error: any) {
        console.error("[getAccommodationById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch accommodation details." };
    }
}

/**
 * CREATE ACCOMMODATION RECORD + STORAGE ROLLBACK + AUDIT LOGGING
 */
export async function createAccommodation(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyAccommodationAccess();

        const name = (formData.get("name") as string)?.trim();
        const type = (formData.get("type") as string)?.trim() || "Resort";
        const description = (formData.get("description") as string)?.trim() || "";
        const address = (formData.get("address") as string)?.trim();
        const priceRange = (formData.get("priceRange") as string)?.trim() || null;
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const websiteUrl = (formData.get("websiteUrl") || formData.get("facebookUrl") as string)?.toString()?.trim() || null;
        const googleMapsUrl = (formData.get("googleMapsUrl") as string)?.trim() || null;
        const amenities = (formData.get("amenities") as string)?.trim() || null;
        const isPublished = formData.get("isPublished") !== "false";

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        if (!name) {
            return { success: false, error: "Accommodation place name is required." };
        }
        if (!address) {
            return { success: false, error: "Complete address is required." };
        }

        const file = (formData.get("imageFile") || formData.get("image") || formData.get("file")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `accommodation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `accommodations/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload photo to storage bucket." };
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        const accommodation = await (prisma as any).accommodation.create({
            data: {
                name,
                type,
                description,
                address,
                priceRange,
                contactNumber,
                websiteUrl,
                googleMapsUrl,
                amenities,
                imageUrl: finalImageUrl,
                barangay,
                isPublished,
            }
        });

        revalidatePath("/admin/accommodation");
        revalidatePath("/tuluyan");
        revalidatePath("/stay");
        revalidatePath("/");

        // 5. Audit Logging for Creation
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Accommodation",
                entityId: accommodation.id,
                entityName: accommodation.name,
                description: `Created accommodation listing: "${accommodation.name}" in ${accommodation.barangay || "{{LGU_NAME}}"}`,
                metadata: {
                    name: accommodation.name,
                    type: accommodation.type,
                    barangay: accommodation.barangay,
                    address: accommodation.address,
                    priceRange: accommodation.priceRange,
                    contactNumber: accommodation.contactNumber,
                    isPublished: accommodation.isPublished,
                }
            });
        } catch (auditErr) {
            console.warn("[createAccommodation] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: accommodation };
    } catch (error: any) {
        console.error("Error creating accommodation listing:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB create failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createAccommodation] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to create accommodation listing." };
    }
}

/**
 * UPDATE ACCOMMODATION RECORD + STORAGE ROLLBACK + PHOTO CLEANUP + AUDIT DIFFS
 */
export async function updateAccommodation(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Accommodation ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyAccommodationAccess();

        const existing = await (prisma as any).accommodation.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Accommodation record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify accommodations outside your barangay." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const type = (formData.get("type") as string)?.trim() || existing.type;
        const description = formData.has("description") ? (formData.get("description") as string)?.trim() || "" : existing.description;
        const address = (formData.get("address") as string)?.trim() || existing.address;
        const priceRange = formData.has("priceRange") ? (formData.get("priceRange") as string)?.trim() || null : existing.priceRange;
        const contactNumber = formData.has("contactNumber") ? (formData.get("contactNumber") as string)?.trim() || null : existing.contactNumber;
        const websiteUrl = formData.has("websiteUrl") 
            ? (formData.get("websiteUrl") as string)?.trim() || null 
            : formData.has("facebookUrl") 
                ? (formData.get("facebookUrl") as string)?.trim() || null 
                : existing.websiteUrl;
        const googleMapsUrl = formData.has("googleMapsUrl") ? (formData.get("googleMapsUrl") as string)?.trim() || null : existing.googleMapsUrl;
        const amenities = formData.has("amenities") ? (formData.get("amenities") as string)?.trim() || null : existing.amenities;

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
            const filename = `accommodation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `accommodations/${filename}`;

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
            type,
            description,
            address,
            priceRange,
            contactNumber,
            websiteUrl,
            googleMapsUrl,
            amenities,
            imageUrl: finalImageUrl,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updated = await (prisma as any).accommodation.update({
            where: { id },
            data: updatePayload
        });

        // 4. STORAGE CLEANUP: Delete old photo if replaced or explicitly removed
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl) {
            try {
                await deleteFileByUrl(oldImageUrl);
            } catch (delErr) {
                console.warn("Failed to delete old accommodation photo from storage bucket:", delErr);
            }
        }

        revalidatePath("/admin/accommodation");
        revalidatePath("/tuluyan");
        revalidatePath("/stay");
        revalidatePath("/");

        // 5. Audit Logging with Structured Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.name !== name) changes["name"] = { old: existing.name, new: name };
            if (existing.type !== type) changes["type"] = { old: existing.type, new: type };
            if (existing.priceRange !== priceRange) changes["priceRange"] = { old: existing.priceRange || "None", new: priceRange || "None" };
            if (existing.address !== address) changes["address"] = { old: existing.address, new: address };
            if (existing.contactNumber !== contactNumber) changes["contactNumber"] = { old: existing.contactNumber || "None", new: contactNumber || "None" };
            if (existing.amenities !== amenities) changes["amenities"] = { old: existing.amenities || "None", new: amenities || "None" };
            if (existing.barangay !== barangay) changes["barangay"] = { old: existing.barangay || "None", new: barangay || "None" };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };
            if (updatePayload.isPublished !== undefined && existing.isPublished !== updatePayload.isPublished) {
                changes["isPublished"] = { old: existing.isPublished, new: updatePayload.isPublished };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "Accommodation",
                entityId: id,
                entityName: updated.name,
                description: `Updated accommodation listing: "${updated.name}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    name: updated.name,
                    barangay: updated.barangay
                }
            });
        } catch (auditErr) {
            console.warn("[updateAccommodation] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating accommodation listing:", error);

        // 4. STORAGE ROLLBACK: If photo was uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateAccommodation] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to update accommodation listing." };
    }
}

/**
 * DELETE ACCOMMODATION RECORD + PHOTO CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteAccommodation(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Accommodation ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyAccommodationAccess();

        const existing = await (prisma as any).accommodation.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Accommodation record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete accommodations outside your barangay." };
        }

        // Automatic Photo Cleanup: Delete image from storage bucket if present
        if (existing.imageUrl) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (err) {
                console.warn("Failed to delete accommodation photo from bucket:", err);
            }
        }

        await (prisma as any).accommodation.delete({
            where: { id }
        });

        revalidatePath("/admin/accommodation");
        revalidatePath("/tuluyan");
        revalidatePath("/stay");
        revalidatePath("/");

        // 5. Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Accommodation",
                entityId: id,
                entityName: existing.name,
                description: `Deleted accommodation listing: "${existing.name}" (${existing.barangay || "{{LGU_NAME}}"})`,
                metadata: {
                    name: existing.name,
                    type: existing.type,
                    barangay: existing.barangay,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        name: existing.name,
                        type: existing.type,
                        description: existing.description,
                        address: existing.address,
                        priceRange: existing.priceRange,
                        contactNumber: existing.contactNumber,
                        websiteUrl: existing.websiteUrl,
                        googleMapsUrl: existing.googleMapsUrl,
                        amenities: existing.amenities,
                        imageUrl: existing.imageUrl,
                        barangay: existing.barangay,
                        isPublished: existing.isPublished,
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteAccommodation] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting accommodation listing:", error);
        return { success: false, error: error.message || "Failed to delete accommodation listing." };
    }
}

/**
 * TOGGLE ACCOMMODATION PUBLISHED STATUS
 */
export async function toggleAccommodationStatus(id: string, currentStatus: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Accommodation ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyAccommodationAccess();

        const existing = await (prisma as any).accommodation.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Accommodation record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify accommodations outside your barangay." };
        }

        const updated = await (prisma as any).accommodation.update({
            where: { id },
            data: { isPublished: !currentStatus }
        });

        revalidatePath("/admin/accommodation");
        revalidatePath("/tuluyan");
        revalidatePath("/stay");
        revalidatePath("/");

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Accommodation",
                entityId: id,
                entityName: updated.name,
                description: `Changed accommodation status for "${updated.name}" to ${updated.isPublished ? "Published" : "Draft"}`,
                metadata: {
                    changes: {
                        isPublished: { old: currentStatus, new: updated.isPublished }
                    },
                    changedFields: ["isPublished"],
                    name: updated.name
                }
            });
        } catch (auditErr) {
            console.warn("[toggleAccommodationStatus] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling accommodation status:", error);
        return { success: false, error: error.message || "Failed to update accommodation status." };
    }
}
