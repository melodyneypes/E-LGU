"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

export type ProjectActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    project?: T;
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
async function verifyProjectsAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/projects") || accessiblePages.includes("/admin/content/projects");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage municipal projects.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: isBarangayAdmin ? user.managedBarangay || null : null,
    };
}

/**
 * GET SINGLE PROJECT BY ID (Lean Selection & Fast Fetch)
 */
export async function getProjectById(id: string): Promise<ProjectActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Project ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyProjectsAccess();

        const project = await (prisma as any).project.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                status: true,
                location: true,
                budget: true,
                contractor: true,
                startDate: true,
                endDate: true,
                progress: true,
                imageUrl: true,
                isPublished: true,
                barangay: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!project) {
            return { success: false, error: "Project record not found." };
        }

        if (isBarangayAdmin && project.barangay && project.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: Access denied to this barangay project." };
        }

        return { success: true, data: project, project };
    } catch (error: any) {
        console.error("[getProjectById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch project details." };
    }
}

/**
 * 2. CREATE PROJECT + 3. ERROR ROLLBACK + 4. STORAGE ROLLBACK + 5. AUDIT LOGGING
 */
export async function createProject(formData: FormData): Promise<ProjectActionResponse> {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyProjectsAccess();

        const title = (formData.get("title") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || "";
        const category = (formData.get("category") as string)?.trim() || "Infrastructure";
        const status = (formData.get("status") as string)?.trim() || "Planned";
        const location = (formData.get("location") as string)?.trim() || "";
        const budget = (formData.get("budget") as string)?.trim() || null;
        const contractor = (formData.get("contractor") as string)?.trim() || null;
        const progress = Math.max(0, Math.min(100, parseInt(formData.get("progress") as string || "0", 10) || 0));

        const startDateStr = formData.get("startDate") as string;
        const endDateStr = formData.get("endDate") as string;
        const startDate = startDateStr ? new Date(startDateStr) : null;
        const endDate = endDateStr ? new Date(endDateStr) : null;

        if (!title || !location) {
            return { success: false, error: "Title and location are required fields." };
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
            const filename = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `projects/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload project photo to storage bucket.");
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        // Database insert with automatic active publish status
        const newProject = await (prisma as any).project.create({
            data: {
                title,
                description,
                category,
                status,
                location,
                budget,
                contractor,
                startDate,
                endDate,
                progress,
                imageUrl: finalImageUrl,
                isPublished: true,
                barangay: barangay || null,
            } as any,
        });

        // 5. Audit Trail Logging with Full Initial Metadata
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Project",
                entityId: newProject.id,
                entityName: title,
                description: `Created municipal project: "${title}" (${category} - ${status})`,
                metadata: {
                    title,
                    description: description || undefined,
                    category,
                    status,
                    location,
                    budget: budget || undefined,
                    contractor: contractor || undefined,
                    progress: `${progress}%`,
                    startDate: startDate ? startDate.toISOString() : undefined,
                    endDate: endDate ? endDate.toISOString() : undefined,
                    barangay: barangay || "Global Municipal",
                    imageUrl: finalImageUrl || null,
                }
            });
        } catch (auditErr) {
            console.warn("[createProject] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/projects");
        revalidatePath("/projects");
        revalidatePath("/");
        return { success: true, project: newProject };
    } catch (error: any) {
        console.error("[createProject Error]:", error);

        // 4. STORAGE ROLLBACK: Delete newly uploaded image if database creation failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createProject] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to create project record." };
    }
}

/**
 * UPDATE PROJECT + IMAGE CLEANUP + STORAGE ROLLBACK + STATE DIFF AUDIT
 */
export async function updateProject(id: string, formData: FormData): Promise<ProjectActionResponse> {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Project ID is required for update." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyProjectsAccess();

        const existing = await (prisma as any).project.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Project record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify projects outside your barangay." };
        }

        const title = (formData.get("title") as string)?.trim() || (existing.title as string);
        const description = formData.has("description") ? (formData.get("description") as string)?.trim() || "" : (existing.description as string);
        const category = (formData.get("category") as string)?.trim() || (existing.category as string) || "Infrastructure";
        const status = (formData.get("status") as string)?.trim() || (existing.status as string) || "Planned";
        const location = (formData.get("location") as string)?.trim() || (existing.location as string);
        const budget = formData.has("budget") ? (formData.get("budget") as string)?.trim() || null : (existing.budget as string | null);
        const contractor = formData.has("contractor") ? (formData.get("contractor") as string)?.trim() || null : (existing.contractor as string | null);
        const progress = formData.has("progress")
            ? Math.max(0, Math.min(100, parseInt(formData.get("progress") as string || "0", 10) || 0))
            : existing.progress;

        const startDateStr = (formData.get("startDate") as string)?.trim();
        const endDateStr = (formData.get("endDate") as string)?.trim();

        // Convert existing dates to yyyy-MM-dd to compare against incoming input value
        const existingStartFormatted = existing.startDate ? new Date(new Date(existing.startDate).getTime() - (new Date(existing.startDate).getTimezoneOffset() * 60000)).toISOString().slice(0, 10) : "";
        const existingEndFormatted = existing.endDate ? new Date(new Date(existing.endDate).getTime() - (new Date(existing.endDate).getTimezoneOffset() * 60000)).toISOString().slice(0, 10) : "";

        const startDate = !startDateStr ? null : (startDateStr === existingStartFormatted ? existing.startDate : new Date(startDateStr));
        const endDate = !endDateStr ? null : (endDateStr === existingEndFormatted ? existing.endDate : new Date(endDateStr));

        const isImageRemoved = formData.get("imageRemoved") === "true";
        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;

        // Upload replacement image if provided
        const file = (formData.get("image") || formData.get("file") || formData.get("imageFile")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `projects/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload updated project photo to storage bucket.");
            }
        }

        let finalImageUrl: string | null = (existing.imageUrl as string | null) || null;
        if (newlyUploadedUrl) {
            finalImageUrl = newlyUploadedUrl;
        } else if (isImageRemoved) {
            finalImageUrl = null;
        } else if (formData.has("imageUrl")) {
            finalImageUrl = rawImageUrl || null;
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
            status,
            location,
            budget,
            contractor,
            startDate,
            endDate,
            progress,
            imageUrl: finalImageUrl,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updatedProject = await (prisma as any).project.update({
            where: { id },
            data: updatePayload,
        });

        // 4. BUCKET CLEANUP: If image was replaced or removed, delete the old file
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl && oldImageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(oldImageUrl);
            } catch (storageErr) {
                console.warn("[updateProject] Failed to delete old image from storage bucket:", storageErr);
            }
        }

        // 5. Audit Logging with Structured State Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.title !== title) changes["title"] = { old: existing.title, new: title };
            if ((existing.description || "") !== (description || "")) changes["description"] = { old: existing.description || "None", new: description || "None" };
            if (existing.category !== category) changes["category"] = { old: existing.category, new: category };
            if (existing.status !== status) changes["status"] = { old: existing.status, new: status };
            if (existing.location !== location) changes["location"] = { old: existing.location, new: location };
            if ((existing.budget || "") !== (budget || "")) changes["budget"] = { old: existing.budget || "None", new: budget || "None" };
            if ((existing.contractor || "") !== (contractor || "")) changes["contractor"] = { old: existing.contractor || "None", new: contractor || "None" };
            if (existing.progress !== progress) changes["progress"] = { old: `${existing.progress}%`, new: `${progress}%` };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };

            // Accurate epoch timestamp comparison
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

            if (updatePayload.isPublished !== undefined && existing.isPublished !== updatePayload.isPublished) {
                changes["isPublished"] = {
                    old: existing.isPublished ? "Published" : "Draft",
                    new: updatePayload.isPublished ? "Published" : "Draft"
                };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "Project",
                entityId: id,
                entityName: title,
                description: `Updated municipal project: "${title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    category,
                    status
                }
            });
        } catch (auditErr) {
            console.warn("[updateProject] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/projects");
        revalidatePath("/projects");
        revalidatePath("/");
        return { success: true, project: updatedProject };
    } catch (error: any) {
        console.error("[updateProject Error]:", error);

        // 4. STORAGE ROLLBACK: If new upload succeeded but update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateProject] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to update project record." };
    }
}

/**
 * DELETE PROJECT + BUCKET IMAGE CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteProject(id: string): Promise<ProjectActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Project ID is required for deletion." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyProjectsAccess();

        const existing = await (prisma as any).project.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Project record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete projects outside your barangay." };
        }

        // Automatic Image Cleanup: Delete project image from bucket if exists
        if (existing.imageUrl && existing.imageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (storageErr) {
                console.warn("[deleteProject] Failed to delete image from bucket:", storageErr);
            }
        }

        await (prisma as any).project.delete({ where: { id } });

        // 5. Audit Logging with Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Project",
                entityId: id,
                entityName: existing.title || "Project Record",
                description: `Deleted municipal project: "${existing.title || id}"`,
                metadata: {
                    title: existing.title,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        title: existing.title,
                        category: existing.category,
                        status: existing.status,
                        location: existing.location,
                        budget: existing.budget,
                        contractor: existing.contractor,
                        progress: existing.progress,
                        startDate: existing.startDate,
                        endDate: existing.endDate,
                        barangay: existing.barangay || "Global Municipal",
                        imageUrl: existing.imageUrl || null
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteProject] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/projects");
        revalidatePath("/projects");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteProject Error]:", error);
        return { success: false, error: error?.message || "Failed to delete project record." };
    }
}

/**
 * TOGGLE PROJECT PUBLISH STATUS + AUDIT LOGGING
 */
export async function toggleProjectStatus(id: string, isPublished: boolean): Promise<ProjectActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Project ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyProjectsAccess();

        const existing = await (prisma as any).project.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Project record not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify projects outside your barangay." };
        }

        await (prisma as any).project.update({
            where: { id },
            data: { isPublished }
        });

        // 5. Audit Logging for Status Toggle
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Project",
                entityId: id,
                entityName: existing.title || "Project Record",
                description: `${isPublished ? "Published" : "Unpublished"} project: "${existing.title || id}"`,
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
            console.warn("[toggleProjectStatus] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/projects");
        revalidatePath("/projects");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[toggleProjectStatus Error]:", error);
        return { success: false, error: error?.message || "Failed to update project status." };
    }
}
