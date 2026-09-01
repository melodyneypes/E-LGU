"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
export async function verifyChurchAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/church");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage church profiles and schedules.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * UPDATE CHURCH INFO + FLYER STORAGE CLEANUP & ROLLBACK + AUDIT DIFFS
 */
export async function updateChurchInfo(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Church ID is required." };
        }

        await verifyChurchAccess();

        const existing = await (prisma as any).churchInfo.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Church profile record not found." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const address = (formData.get("address") as string)?.trim() || existing.address;
        const locationUrl = (formData.get("locationUrl") as string)?.trim() || existing.locationUrl;
        const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : existing.latitude;
        const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : existing.longitude;
        const isFlyerRemoved = formData.get("flyerRemoved") === "true";
        const rawFlyerUrl = (formData.get("flyerUrl") as string)?.trim() || null;

        // Handle Flyer / PDF / Image File Upload
        const file = (formData.get("flyerFile") || formData.get("file") || formData.get("imageFile")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'pdf';
            const filename = `church-flyer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `church/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload church flyer to storage bucket." };
            }
        }

        let finalFlyerUrl: string | null = existing.flyerUrl || null;
        if (newlyUploadedUrl) {
            finalFlyerUrl = newlyUploadedUrl;
        } else if (isFlyerRemoved) {
            finalFlyerUrl = null;
        } else if (formData.has("flyerUrl")) {
            finalFlyerUrl = rawFlyerUrl || null;
        }

        const updated = await (prisma as any).churchInfo.update({
            where: { id },
            data: {
                name,
                address,
                locationUrl,
                latitude,
                longitude,
                flyerUrl: finalFlyerUrl,
            }
        });

        // 4. STORAGE CLEANUP: Delete old flyer from storage bucket if replaced or removed
        const oldFlyerUrl = existing.flyerUrl;
        if (oldFlyerUrl && oldFlyerUrl !== finalFlyerUrl) {
            try {
                console.log(`[updateChurchInfo] Deleting replaced/removed flyer: "${oldFlyerUrl}"`);
                await deleteFileByUrl(oldFlyerUrl);
            } catch (delErr) {
                console.warn("[updateChurchInfo] Storage cleanup warning:", delErr);
            }
        }

        revalidatePath("/admin/church");
        revalidatePath("/church");
        revalidatePath("/simbahan");
        revalidatePath("/");

        // 5. Audit Logging with Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.name !== name) changes["name"] = { old: existing.name, new: name };
            if (existing.address !== address) changes["address"] = { old: existing.address, new: address };
            if (existing.locationUrl !== locationUrl) changes["locationUrl"] = { old: existing.locationUrl, new: locationUrl };
            if (existing.flyerUrl !== finalFlyerUrl) changes["flyerUrl"] = { old: existing.flyerUrl, new: finalFlyerUrl };

            await logActivity({
                action: "UPDATE",
                entityType: "ChurchInfo",
                entityId: id,
                entityName: updated.name || "Church Info",
                description: `Updated church profile: "${updated.name}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    name: updated.name,
                    address: updated.address
                }
            });
        } catch (auditErr) {
            console.warn("[updateChurchInfo] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, churchInfo: updated };
    } catch (error: any) {
        console.error("Error updating church info:", error);

        // 4. STORAGE ROLLBACK: If flyer was uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateChurchInfo] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to update church profile." };
    }
}

/**
 * CREATE MASS SCHEDULE + AUDIT LOGGING
 */
export async function addMassSchedule(data: any) {
    try {
        await verifyChurchAccess();

        if (!data.day || !data.time) {
            return { success: false, error: "Day and Time Slot are required." };
        }

        const created = await (prisma as any).churchSchedule.create({
            data: {
                churchInfoId: data.churchInfoId,
                day: data.day,
                time: data.time,
                language: data.language || "Ilocano",
                type: data.type || "Mass",
                date: data.date ? new Date(data.date) : null,
                prio: Number(data.prio || 0),
                description: data.description || null
            }
        });

        revalidatePath("/admin/church");
        revalidatePath("/church");
        revalidatePath("/simbahan");
        revalidatePath("/");

        try {
            await logActivity({
                action: "CREATE",
                entityType: "ChurchSchedule",
                entityId: created.id,
                entityName: `${data.day} ${data.time}`,
                description: `Added mass schedule: ${data.day} at ${data.time} (${data.language || "Ilocano"})`,
                metadata: {
                    day: data.day,
                    time: data.time,
                    language: data.language,
                    type: data.type,
                    prio: data.prio
                }
            });
        } catch (auditErr) {
            console.warn("[addMassSchedule] Audit log warning:", auditErr);
        }

        return { success: true, data: created, schedule: created };
    } catch (error: any) {
        console.error("Error adding mass schedule:", error);
        return { success: false, error: error?.message || "Failed to add mass schedule." };
    }
}

/**
 * UPDATE MASS SCHEDULE + AUDIT DIFFS
 */
export async function updateMassSchedule(id: string, data: any) {
    try {
        if (!id) {
            return { success: false, error: "Schedule ID is required." };
        }

        await verifyChurchAccess();

        const existing = await (prisma as any).churchSchedule.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Mass schedule record not found." };
        }

        const updated = await (prisma as any).churchSchedule.update({
            where: { id },
            data: {
                day: data.day || existing.day,
                time: data.time || existing.time,
                language: data.language !== undefined ? data.language : existing.language,
                type: data.type !== undefined ? data.type : existing.type,
                date: data.date ? new Date(data.date) : null,
                prio: Number(data.prio || 0),
                description: data.description !== undefined ? data.description : existing.description
            }
        });

        revalidatePath("/admin/church");
        revalidatePath("/church");
        revalidatePath("/simbahan");
        revalidatePath("/");

        try {
            await logActivity({
                action: "UPDATE",
                entityType: "ChurchSchedule",
                entityId: id,
                entityName: `${updated.day} ${updated.time}`,
                description: `Updated mass schedule: ${updated.day} at ${updated.time}`,
                metadata: {
                    day: updated.day,
                    time: updated.time,
                    language: updated.language,
                    type: updated.type
                }
            });
        } catch (auditErr) {
            console.warn("[updateMassSchedule] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, schedule: updated };
    } catch (error: any) {
        console.error("Error updating mass schedule:", error);
        return { success: false, error: error?.message || "Failed to update mass schedule." };
    }
}

/**
 * DELETE MASS SCHEDULE + AUDIT LOGGING
 */
export async function deleteMassSchedule(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Schedule ID is required." };
        }

        await verifyChurchAccess();

        const existing = await (prisma as any).churchSchedule.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Mass schedule record not found." };
        }

        await (prisma as any).churchSchedule.delete({ where: { id } });

        revalidatePath("/admin/church");
        revalidatePath("/church");
        revalidatePath("/simbahan");
        revalidatePath("/");

        try {
            await logActivity({
                action: "DELETE",
                entityType: "ChurchSchedule",
                entityId: id,
                entityName: `${existing.day} ${existing.time}`,
                description: `Deleted mass schedule: ${existing.day} at ${existing.time}`,
                metadata: {
                    deletedRecordSnapshot: existing
                }
            });
        } catch (auditErr) {
            console.warn("[deleteMassSchedule] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting mass schedule:", error);
        return { success: false, error: error?.message || "Failed to delete mass schedule." };
    }
}

/**
 * CREATE OR UPDATE CHURCH FINANCIAL COLLECTION + AUDIT LOGGING
 */
export async function saveChurchCollection(data: any) {
    try {
        await verifyChurchAccess();

        let total = Number(data.secondBasket || 0) + Number(data.weekdays || 0) + Number(data.envelopes || 0);
        
        if (data.sundayMassJson && Array.isArray(data.sundayMassJson)) {
            data.sundayMassJson.forEach((item: any) => {
                total += Number(item.amount || 0);
            });
        }
        
        if (data.donationsJson && Array.isArray(data.donationsJson)) {
            data.donationsJson.forEach((item: any) => {
                total += Number(item.amount || 0);
            });
        }

        const payload = {
            churchInfoId: data.churchInfoId,
            date: new Date(data.date),
            sundayMassJson: data.sundayMassJson,
            secondBasket: Number(data.secondBasket || 0),
            weekdays: Number(data.weekdays || 0),
            envelopes: Number(data.envelopes || 0),
            donationsJson: data.donationsJson,
            totalAmount: total
        };

        let result;
        if (data.id) {
            result = await (prisma as any).churchCollection.update({
                where: { id: data.id },
                data: payload
            });
        } else {
            result = await (prisma as any).churchCollection.create({
                data: payload
            });
        }
        
        revalidatePath("/admin/church");
        revalidatePath("/");

        try {
            await logActivity({
                action: data.id ? "UPDATE" : "CREATE",
                entityType: "ChurchCollection",
                entityId: result.id,
                entityName: `₱${total.toLocaleString()}`,
                description: `${data.id ? "Updated" : "Recorded"} church collection of ₱${total.toLocaleString()} for ${new Date(data.date).toLocaleDateString()}`,
                metadata: { totalAmount: total, date: data.date }
            });
        } catch (auditErr) {
            console.warn("[saveChurchCollection] Audit log warning:", auditErr);
        }

        return { success: true, data: result, collection: result };
    } catch (error: any) {
        console.error("Error saving church collection:", error);
        return { success: false, error: error?.message || "Failed to record church collection." };
    }
}

/**
 * DELETE CHURCH FINANCIAL COLLECTION + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteCollectionEntry(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Collection ID is required." };
        }

        await verifyChurchAccess();

        const existing = await (prisma as any).churchCollection.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Collection record not found." };
        }

        await (prisma as any).churchCollection.delete({ where: { id } });

        revalidatePath("/admin/church");
        revalidatePath("/");

        try {
            await logActivity({
                action: "DELETE",
                entityType: "ChurchCollection",
                entityId: id,
                entityName: `₱${Number(existing.totalAmount || 0).toLocaleString()}`,
                description: `Deleted church collection entry of ₱${Number(existing.totalAmount || 0).toLocaleString()} (ID: ${id})`,
                metadata: {
                    deletedRecordSnapshot: existing
                }
            });
        } catch (auditErr) {
            console.warn("[deleteCollectionEntry] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting collection entry:", error);
        return { success: false, error: error?.message || "Failed to delete collection entry." };
    }
}
