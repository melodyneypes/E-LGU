"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

export type EventActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    event?: T;
    error?: string;
};

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
 * Enforces role checking: ADMIN (LGU), CONTENT_ADMIN, BARANGAY_ADMIN (scoped), or custom accessiblePages
 */
async function verifyEventsAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/events") || accessiblePages.includes("/admin/content/events");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage municipal events.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: isBarangayAdmin ? user.managedBarangay || null : null,
    };
}

/**
 * GET SINGLE EVENT BY ID (Lean Selection & Fast Fetch)
 */
export async function getEventById(id: string): Promise<EventActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Event ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyEventsAccess();

        const event = await (prisma as any).event.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                startDate: true,
                endDate: true,
                venueName: true,
                address: true,
                contactNumber: true,
                imageUrl: true,
                reminders: true,
                latitude: true,
                longitude: true,
                googleMapsUrl: true,
                isPublished: true,
                barangay: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!event) {
            return { success: false, error: "Event record not found." };
        }

        if (isBarangayAdmin && event.barangay && event.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: Access denied to this barangay event." };
        }

        return { success: true, data: event, event };
    } catch (error: any) {
        console.error("[getEventById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch event details." };
    }
}

/**
 * 2. CREATE EVENT + 3. ERROR ROLLBACK + 4. STORAGE ROLLBACK + 5. AUDIT LOGGING
 */
export async function createEvent(formData: FormData): Promise<EventActionResponse> {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyEventsAccess();

        const title = (formData.get("title") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || null;
        const category = (formData.get("category") as string)?.trim() || "Community";
        const startDateStr = formData.get("startDate") as string;
        const endDateStr = formData.get("endDate") as string;
        const venueName = (formData.get("venueName") as string)?.trim();
        const address = (formData.get("address") as string)?.trim();
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
        const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
        const googleMapsUrl = (formData.get("googleMapsUrl") as string)?.trim() || null;

        if (!title || !startDateStr || !endDateStr || !venueName || !address) {
            return { success: false, error: "Title, start date, end date, venue, and address are required fields." };
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        let reminders: string[] = [];
        const rawReminders = formData.get("reminders");
        if (typeof rawReminders === "string" && rawReminders.trim() !== "") {
            try {
                const parsed = JSON.parse(rawReminders);
                if (Array.isArray(parsed)) reminders = parsed;
            } catch {
                reminders = rawReminders.split(",").map((r) => r.trim()).filter(Boolean);
            }
        }

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        // Upload banner image to bucket if provided
        const file = (formData.get("image") || formData.get("file") || formData.get("imageFile")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `events/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload event banner to storage bucket.");
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        // Database insert with automatic active publish status
        const newEvent = await (prisma as any).event.create({
            data: {
                title,
                description,
                category,
                startDate,
                endDate,
                venueName,
                address,
                contactNumber,
                imageUrl: finalImageUrl,
                reminders,
                latitude,
                longitude,
                googleMapsUrl,
                isPublished: true,
                barangay: barangay || null,
            } as any,
        });

        // 5. Audit Trail Logging with Full Initial Metadata
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Event",
                entityId: newEvent.id,
                entityName: title,
                description: `Created municipal event: "${title}" (${category})`,
                metadata: {
                    title,
                    description,
                    category,
                    venueName,
                    address,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    barangay: barangay || "Global Municipal",
                    imageUrl: finalImageUrl || null,
                    reminders: reminders.length > 0 ? reminders : undefined,
                }
            });
        } catch (auditErr) {
            console.warn("[createEvent] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/events");
        revalidatePath("/events");
        revalidatePath("/");
        return { success: true, event: newEvent };
    } catch (error: any) {
        console.error("[createEvent Error]:", error);

        // 4. STORAGE ROLLBACK: Delete newly uploaded image if database creation failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createEvent] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to create event record." };
    }
}

/**
 * UPDATE EVENT + IMAGE CLEANUP + STORAGE ROLLBACK + STATE DIFF AUDIT
 */
export async function updateEvent(id: string, formData: FormData): Promise<EventActionResponse> {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Event ID is required for update." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyEventsAccess();

        const existing = await (prisma as any).event.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Event record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify events outside your barangay." };
        }

        const title = (formData.get("title") as string)?.trim() || (existing.title as string);
        const description = formData.has("description") ? (formData.get("description") as string)?.trim() || null : (existing.description as string | null);
        const category = (formData.get("category") as string)?.trim() || (existing.category as string) || "Community";
        const startDateStr = formData.get("startDate") as string;
        const endDateStr = formData.get("endDate") as string;
        const startDate = startDateStr ? new Date(startDateStr) : existing.startDate;
        const endDate = endDateStr ? new Date(endDateStr) : existing.endDate;
        const venueName = (formData.get("venueName") as string)?.trim() || (existing.venueName as string);
        const address = (formData.get("address") as string)?.trim() || (existing.address as string);
        const contactNumber = formData.has("contactNumber") ? (formData.get("contactNumber") as string)?.trim() || null : (existing.contactNumber as string | null);
        const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : existing.latitude;
        const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : existing.longitude;
        const googleMapsUrl = formData.has("googleMapsUrl") ? (formData.get("googleMapsUrl") as string)?.trim() || null : (existing.googleMapsUrl as string | null);

        const isImageRemoved = formData.get("imageRemoved") === "true";
        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;

        // Upload replacement image if provided
        const file = (formData.get("image") || formData.get("file") || formData.get("imageFile")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `events/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload updated event image to storage bucket.");
            }
        }

        let finalImageUrl: string | null = (existing.imageUrl as string | null) || null;
        if (newlyUploadedUrl) {
            finalImageUrl = newlyUploadedUrl;
        } else if (isImageRemoved) {
            finalImageUrl = null;
        } else if (rawImageUrl !== null) {
            finalImageUrl = rawImageUrl || null;
        }

        let reminders: string[] = existing.reminders || [];
        const rawReminders = formData.get("reminders");
        if (typeof rawReminders === "string" && rawReminders.trim() !== "") {
            try {
                const parsed = JSON.parse(rawReminders);
                if (Array.isArray(parsed)) reminders = parsed;
            } catch {
                reminders = rawReminders.split(",").map((r) => r.trim()).filter(Boolean);
            }
        }

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        } else if (!barangay) {
            barangay = (existing.barangay as string | null) || null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        const updatePayload: Record<string, any> = {
            title,
            description,
            category,
            startDate,
            endDate,
            venueName,
            address,
            contactNumber,
            imageUrl: finalImageUrl,
            reminders,
            latitude,
            longitude,
            googleMapsUrl,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updatedEvent = await (prisma as any).event.update({
            where: { id },
            data: updatePayload,
        });

        // 4. BUCKET CLEANUP: If image was replaced or removed, delete the old file
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl && oldImageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(oldImageUrl);
            } catch (storageErr) {
                console.warn("[updateEvent] Failed to delete old image from storage bucket:", storageErr);
            }
        }

        // 5. Audit Logging with Structured State Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.title !== title) changes["title"] = { old: existing.title, new: title };
            if ((existing.description || "") !== (description || "")) changes["description"] = { old: existing.description || "None", new: description || "None" };
            if (existing.category !== category) changes["category"] = { old: existing.category, new: category };
            if ((existing.venueName || "") !== venueName) changes["venueName"] = { old: existing.venueName || "None", new: venueName };
            if ((existing.address || "") !== address) changes["address"] = { old: existing.address || "None", new: address };
            if ((existing.contactNumber || "") !== (contactNumber || "")) changes["contactNumber"] = { old: existing.contactNumber || "None", new: contactNumber || "None" };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };

            // Check reminders array diff
            const oldReminders = Array.isArray(existing.reminders) ? existing.reminders : [];
            if (JSON.stringify(oldReminders) !== JSON.stringify(reminders)) {
                changes["reminders"] = {
                    old: oldReminders.length > 0 ? oldReminders.join("\n") : "None",
                    new: reminders.length > 0 ? reminders.join("\n") : "None",
                };
            }

            // Accurate epoch timestamp diff to prevent false timezone diff triggers
            const oldStartTime = existing.startDate ? new Date(existing.startDate).getTime() : 0;
            const newStartTime = startDate ? new Date(startDate).getTime() : 0;
            if (Math.abs(oldStartTime - newStartTime) > 1000) {
                changes["startDate"] = {
                    old: existing.startDate ? new Date(existing.startDate).toISOString() : "None",
                    new: startDate ? new Date(startDate).toISOString() : "None"
                };
            }

            const oldEndTime = existing.endDate ? new Date(existing.endDate).getTime() : 0;
            const newEndTime = endDate ? new Date(endDate).getTime() : 0;
            if (Math.abs(oldEndTime - newEndTime) > 1000) {
                changes["endDate"] = {
                    old: existing.endDate ? new Date(existing.endDate).toISOString() : "None",
                    new: endDate ? new Date(endDate).toISOString() : "None"
                };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "Event",
                entityId: id,
                entityName: title,
                description: `Updated municipal event: "${title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    category
                }
            });
        } catch (auditErr) {
            console.warn("[updateEvent] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/events");
        revalidatePath("/events");
        revalidatePath("/");
        return { success: true, event: updatedEvent };
    } catch (error: any) {
        console.error("[updateEvent Error]:", error);

        // 4. STORAGE ROLLBACK: If new upload succeeded but update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateEvent] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to update event record." };
    }
}

/**
 * DELETE EVENT + BUCKET IMAGE CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteEvent(id: string): Promise<EventActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Event ID is required for deletion." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyEventsAccess();

        const existing = await (prisma as any).event.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Event record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete events outside your barangay." };
        }

        // Automatic Image Cleanup: Delete event banner from bucket if exists
        if (existing.imageUrl && existing.imageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (storageErr) {
                console.warn("[deleteEvent] Failed to delete image from bucket:", storageErr);
            }
        }

        await (prisma as any).event.delete({ where: { id } });

        // 5. Audit Logging with Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Event",
                entityId: id,
                entityName: existing.title || "Event Record",
                description: `Deleted municipal event: "${existing.title || id}"`,
                metadata: {
                    title: existing.title,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        title: existing.title,
                        category: existing.category,
                        venueName: existing.venueName,
                        startDate: existing.startDate,
                        endDate: existing.endDate,
                        barangay: existing.barangay || "Global Municipal",
                        imageUrl: existing.imageUrl || null
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteEvent] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/events");
        revalidatePath("/events");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteEvent Error]:", error);
        return { success: false, error: error?.message || "Failed to delete event record." };
    }
}

/**
 * TOGGLE EVENT PUBLISH STATUS + AUDIT LOGGING
 */
export async function toggleEventStatus(id: string, isPublished: boolean): Promise<EventActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Event ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyEventsAccess();

        const existing = await (prisma as any).event.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Event record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify events outside your barangay." };
        }

        await (prisma as any).event.update({
            where: { id },
            data: { isPublished }
        });

        // 5. Audit Logging for Status Toggle
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Event",
                entityId: id,
                entityName: existing.title || "Event Record",
                description: `${isPublished ? "Published" : "Unpublished"} event: "${existing.title || id}"`,
                metadata: {
                    isPublished: isPublished ? "Published" : "Draft",
                    changes: {
                        isPublished: {
                            old: existing.isPublished ? "Published" : "Draft",
                            new: isPublished ? "Published" : "Draft"
                        }
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[toggleEventStatus] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/events");
        revalidatePath("/events");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[toggleEventStatus Error]:", error);
        return { success: false, error: error?.message || "Failed to update event status." };
    }
}
