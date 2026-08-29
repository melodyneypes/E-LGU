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
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), CONTENT_ADMIN, or custom accessiblePages
 */
export async function verifyCitizenCharterAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isContentAdmin = role === "CONTENT_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/citizens-charter");

    if (!isLguAdmin && !isContentAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage Citizen's Charters.");
    }

    return user;
}

/**
 * 2. GET ALL CITIZEN CHARTERS (LEAN QUERY)
 */
export async function getCitizenCharters() {
    try {
        await verifyCitizenCharterAccess();

        const charters = await prisma.citizenCharter.findMany({
            select: {
                id: true,
                officeName: true,
                fileUrl: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { officeName: "asc" },
        });

        return { success: true, data: charters, charters };
    } catch (error: any) {
        console.error("[getCitizenCharters] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch citizen charters." };
    }
}

/**
 * 3. GET CITIZEN CHARTER BY ID (FAST MODAL SYNC)
 */
export async function getCitizenCharterById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Charter ID is required." };
        }

        await verifyCitizenCharterAccess();

        const charter = await prisma.citizenCharter.findUnique({
            where: { id },
        });

        if (!charter) {
            return { success: false, error: "Citizen charter document not found." };
        }

        return { success: true, data: charter, charter };
    } catch (error: any) {
        console.error("[getCitizenCharterById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch charter document." };
    }
}

/**
 * 4. CREATE CITIZEN CHARTER + FILE UPLOAD + AUDIT LOGGING
 */
export async function createCitizenCharter(formData: FormData) {
    let uploadedFileUrl: string | null = null;
    try {
        await verifyCitizenCharterAccess();

        const officeName = (formData.get("officeName") as string)?.trim();
        const file = (formData.get("file") || formData.get("document")) as File | null;

        if (!officeName) {
            return { success: false, error: "Office or Department name is required." };
        }

        if (!file || file.size === 0 || typeof file.name !== "string" || file.name === "undefined") {
            return { success: false, error: "Charter document file (PDF or Image) is required." };
        }

        // Upload to Supabase Storage in system-assets bucket under citizens-charter/
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `citizens-charter/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const publicUrl = await uploadFile(buffer, fileName, "system-assets", file.type);

        if (!publicUrl) {
            return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
        }

        uploadedFileUrl = publicUrl;

        const charter = await prisma.citizenCharter.create({
            data: {
                officeName,
                fileUrl: publicUrl,
                isActive: true,
            },
        });

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");
        revalidatePath("/citizens-charter");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "CitizenCharter",
                entityId: charter.id,
                entityName: officeName,
                description: `Published Citizen's Charter for: "${officeName}"`,
                metadata: {
                    officeName,
                    fileUrl: publicUrl,
                },
            });
        } catch (auditErr) {
            console.warn("[createCitizenCharter] Audit log warning:", auditErr);
        }

        return { success: true, data: charter, charter };
    } catch (error: any) {
        // Rollback uploaded file if DB save fails
        if (uploadedFileUrl) {
            try {
                await deleteFileByUrl(uploadedFileUrl);
            } catch (rollbackErr) {
                console.warn("[createCitizenCharter] Storage rollback warning:", rollbackErr);
            }
        }
        console.error("[createCitizenCharter] Error:", error);
        return { success: false, error: error?.message || "Failed to create Citizen's Charter." };
    }
}

/**
 * 5. UPDATE CITIZEN CHARTER + FILE REPLACEMENT + PRECISE AUDIT DIFFS
 */
export async function updateCitizenCharter(id: string, formData: FormData) {
    let newUploadedFileUrl: string | null = null;
    try {
        if (!id) {
            return { success: false, error: "Charter ID is required." };
        }

        await verifyCitizenCharterAccess();

        const officeName = (formData.get("officeName") as string)?.trim();
        const file = (formData.get("file") || formData.get("document")) as File | null;

        const existing = await prisma.citizenCharter.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Citizen's Charter not found." };
        }

        let fileUrl = existing.fileUrl;

        // If a new file is uploaded
        if (file && file.size > 0 && typeof file.name === "string" && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `citizens-charter/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const publicUrl = await uploadFile(buffer, fileName, "system-assets", file.type);

            if (!publicUrl) {
                return { success: false, error: "Failed to upload new document file." };
            }

            newUploadedFileUrl = publicUrl;
            fileUrl = publicUrl;
        }

        const finalOfficeName = officeName || existing.officeName;

        const updated = await prisma.citizenCharter.update({
            where: { id },
            data: {
                officeName: finalOfficeName,
                fileUrl,
            },
        });

        // Delete old file from storage if a new one was uploaded
        if (existing.fileUrl && newUploadedFileUrl && existing.fileUrl !== newUploadedFileUrl) {
            try {
                await deleteFileByUrl(existing.fileUrl);
            } catch (delErr) {
                console.warn("[updateCitizenCharter] Old file cleanup warning:", delErr);
            }
        }

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");
        revalidatePath("/citizens-charter");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.officeName !== finalOfficeName) {
                changes["officeName"] = { old: existing.officeName, new: finalOfficeName };
            }
            if (existing.fileUrl !== fileUrl) {
                changes["document"] = { old: existing.fileUrl, new: fileUrl };
            }

            const modifiedFieldNames = Object.keys(changes);
            const descriptionSummary = modifiedFieldNames.length > 0
                ? `Updated Citizen's Charter for "${updated.officeName}" (Modified: ${modifiedFieldNames.join(", ")})`
                : `Updated Citizen's Charter for "${updated.officeName}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "CitizenCharter",
                entityId: id,
                entityName: updated.officeName,
                description: descriptionSummary,
                metadata: {
                    officeName: updated.officeName,
                    changes,
                    previousOfficeName: existing.officeName,
                },
            });
        } catch (auditErr) {
            console.warn("[updateCitizenCharter] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, charter: updated };
    } catch (error: any) {
        // Rollback uploaded file if DB save fails
        if (newUploadedFileUrl) {
            try {
                await deleteFileByUrl(newUploadedFileUrl);
            } catch (rollbackErr) {
                console.warn("[updateCitizenCharter] Storage rollback warning:", rollbackErr);
            }
        }
        console.error("[updateCitizenCharter] Error:", error);
        return { success: false, error: error?.message || "Failed to update Citizen's Charter." };
    }
}

/**
 * 6. TOGGLE CITIZEN CHARTER STATUS + AUDIT LOGGING
 */
export async function toggleCitizenCharterStatus(id: string, isActive: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Charter ID is required." };
        }

        await verifyCitizenCharterAccess();

        const existing = await prisma.citizenCharter.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Citizen's Charter not found." };
        }

        const updated = await prisma.citizenCharter.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");
        revalidatePath("/citizens-charter");

        // Audit Logging
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "CitizenCharter",
                entityId: id,
                entityName: existing.officeName,
                description: `Changed status of Citizen's Charter "${existing.officeName}" to ${isActive ? "Active" : "Inactive"}`,
                metadata: {
                    officeName: existing.officeName,
                    changes: { isActive: { old: existing.isActive, new: isActive } },
                },
            });
        } catch (auditErr) {
            console.warn("[toggleCitizenCharterStatus] Audit log warning:", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleCitizenCharterStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to update status." };
    }
}

/**
 * 7. DELETE CITIZEN CHARTER + STORAGE CLEANUP + AUDIT SNAPSHOT
 */
export async function deleteCitizenCharter(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Charter ID is required." };
        }

        await verifyCitizenCharterAccess();

        const existing = await prisma.citizenCharter.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Citizen's Charter not found." };
        }

        // Delete from database
        await prisma.citizenCharter.delete({
            where: { id },
        });

        // Delete from storage
        if (existing.fileUrl) {
            try {
                await deleteFileByUrl(existing.fileUrl);
            } catch (delErr) {
                console.warn("[deleteCitizenCharter] Storage cleanup warning:", delErr);
            }
        }

        revalidatePath("/user/citizens-charter");
        revalidatePath("/admin/citizens-charter");
        revalidatePath("/citizens-charter");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "CitizenCharter",
                entityId: id,
                entityName: existing.officeName,
                description: `Deleted Citizen's Charter for: "${existing.officeName}"`,
                metadata: {
                    deletedRecordSnapshot: existing,
                },
            });
        } catch (auditErr) {
            console.warn("[deleteCitizenCharter] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteCitizenCharter] Error:", error);
        return { success: false, error: error?.message || "Failed to delete Citizen's Charter." };
    }
}
