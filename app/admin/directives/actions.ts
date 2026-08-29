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
    name?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role checking: ADMIN (LGU), MAYOR, or custom accessiblePages
 */
async function verifyDirectivesAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isMayor = role === "MAYOR";
    const hasPageAccess = accessiblePages.includes("/admin/directives");

    if (!isLguAdmin && !isMayor && !hasPageAccess) {
        throw new Error("Forbidden: Executive privileges required to manage directives.");
    }

    return user;
}

/**
 * GET EXECUTIVE DIRECTIVES (Paginated & Filtered)
 */
export async function getExecutiveDirectives(options: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    priority?: string;
    targetScope?: string;
    targetBarangay?: string;
}) {
    try {
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.max(1, options.pageSize || 10);
        const search = options.search || "";
        const category = options.category || "ALL";
        const priority = options.priority || "ALL";
        const targetScope = options.targetScope || "ALL";
        const targetBarangay = options.targetBarangay || "ALL";

        const where: any = {};

        if (category !== "ALL") {
            where.category = category;
        }

        if (priority !== "ALL") {
            where.priority = priority;
        }

        if (targetScope !== "ALL") {
            where.targetScope = targetScope;
        }

        if (targetBarangay !== "ALL") {
            where.targetBarangay = { equals: targetBarangay, mode: "insensitive" };
        }

        if (search.trim()) {
            where.OR = [
                { title: { contains: search.trim(), mode: "insensitive" } },
                { content: { contains: search.trim(), mode: "insensitive" } },
                { senderName: { contains: search.trim(), mode: "insensitive" } },
            ];
        }

        const [directives, totalCount] = await Promise.all([
            (prisma as any).executiveDirective.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    category: true,
                    priority: true,
                    targetScope: true,
                    targetBarangay: true,
                    targetBarangays: true,
                    attachmentUrl: true,
                    attachmentName: true,
                    attachmentSize: true,
                    senderName: true,
                    senderId: true,
                    isPublished: true,
                    createdAt: true,
                    updatedAt: true,
                    reads: {
                        select: {
                            id: true,
                            userId: true,
                            readAt: true,
                            user: {
                                select: {
                                    name: true,
                                    managedBarangay: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            (prisma as any).executiveDirective.count({ where })
        ]);

        const formatted = directives.map((d: any) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt?.toISOString() || d.createdAt.toISOString(),
            reads: (d.reads || []).map((r: any) => ({
                id: r.id,
                userId: r.userId,
                readAt: r.readAt.toISOString(),
                user: r.user ? {
                    name: r.user.name,
                    managedBarangay: r.user.managedBarangay,
                } : null
            }))
        }));

        return { success: true, data: formatted, totalCount };
    } catch (error: any) {
        console.error("Error fetching executive directives:", error);
        return { success: false, error: error.message || "Failed to fetch directives." };
    }
}

/**
 * CREATE EXECUTIVE DIRECTIVE + STORAGE ROLLBACK + AUDIT LOGGING
 */
export async function createExecutiveDirective(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        const user = await verifyDirectivesAccess();

        const title = (formData.get("title") as string)?.trim();
        const content = (formData.get("content") as string)?.trim();
        const category = (formData.get("category") as string) || "GENERAL_ORDER";
        const priority = (formData.get("priority") as string) || "NORMAL";
        const targetScope = (formData.get("targetScope") as string) || "ALL_CAPTAINS";
        const targetBarangaysRaw = formData.get("targetBarangays") as string;
        
        let targetBarangays: string[] = [];
        if (targetBarangaysRaw) {
            try {
                targetBarangays = JSON.parse(targetBarangaysRaw);
            } catch {
                targetBarangays = [];
            }
        }
        const targetBarangay = targetBarangays.length > 0 ? targetBarangays.join(", ") : null;
        const senderName = user.name || user.email || "Office of the Municipal Mayor";

        if (!title) {
            return { success: false, error: "Directive title is required." };
        }
        if (!content) {
            return { success: false, error: "Directive message content is required." };
        }
        if (targetScope === "SPECIFIC_BARANGAY" && targetBarangays.length === 0) {
            return { success: false, error: "Please select at least one target Barangay." };
        }

        let attachmentUrl: string | null = null;
        let attachmentName: string | null = null;
        let attachmentSize: string | null = null;

        const file = formData.get("attachment") as File | null;
        if (file && typeof file !== "string" && file.size > 0 && file.name && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const sanitizedBase = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `directives/${Date.now()}_${sanitizedBase}`;
            const mimeType = file.type || "application/pdf";

            const uploadedUrl = await uploadFile(buffer, fileName, "system-assets", mimeType);
            if (uploadedUrl) {
                newlyUploadedUrl = uploadedUrl;
                attachmentUrl = uploadedUrl;
                attachmentName = file.name;
                attachmentSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
            } else {
                throw new Error("Failed to upload directive attachment to storage bucket.");
            }
        }

        const directive = await (prisma as any).executiveDirective.create({
            data: {
                title,
                content,
                category,
                priority,
                targetScope,
                targetBarangays,
                targetBarangay,
                senderName,
                senderId: user.id,
                attachmentUrl,
                attachmentName,
                attachmentSize,
                isPublished: true,
            }
        });

        revalidatePath("/admin/directives");
        revalidatePath("/captain/dashboard");
        revalidatePath("/mayor/directives");

        // 5. Audit Logging for Creation
        try {
            await logActivity({
                action: "CREATE",
                entityType: "ExecutiveDirective",
                entityId: directive.id,
                entityName: directive.title,
                description: `Issued Executive Directive: "${directive.title}" (${priority} - ${category})`,
                metadata: {
                    title: directive.title,
                    category,
                    priority,
                    targetScope,
                    targetBarangay,
                    attachmentName,
                    senderName
                }
            });
        } catch (auditErr) {
            console.warn("[createExecutiveDirective] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: directive };
    } catch (error: any) {
        console.error("Error creating executive directive:", error);

        // 4. STORAGE ROLLBACK: If file was uploaded but DB transaction failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createExecutiveDirective] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to issue directive." };
    }
}

/**
 * UPDATE EXECUTIVE DIRECTIVE + STORAGE ROLLBACK + ATTACHMENT CLEANUP + AUDIT DIFFS
 */
export async function updateExecutiveDirective(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Directive ID is required." };
        }

        await verifyDirectivesAccess();

        const existing = await (prisma as any).executiveDirective.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Directive record not found." };
        }

        const title = (formData.get("title") as string)?.trim() || existing.title;
        const content = (formData.get("content") as string)?.trim() || existing.content;
        const category = (formData.get("category") as string) || existing.category;
        const priority = (formData.get("priority") as string) || existing.priority;
        const targetScope = (formData.get("targetScope") as string) || existing.targetScope;
        const isFileRemoved = formData.get("fileRemoved") === "true";

        const targetBarangaysRaw = formData.get("targetBarangays") as string;
        let targetBarangays: string[] = existing.targetBarangays || [];
        if (targetBarangaysRaw) {
            try {
                targetBarangays = JSON.parse(targetBarangaysRaw);
            } catch {
                targetBarangays = existing.targetBarangays || [];
            }
        }
        const targetBarangay = targetBarangays.length > 0 ? targetBarangays.join(", ") : null;

        let attachmentUrl = existing.attachmentUrl;
        let attachmentName = existing.attachmentName;
        let attachmentSize = existing.attachmentSize;

        const file = formData.get("attachment") as File | null;
        if (file && typeof file !== "string" && file.size > 0 && file.name && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const sanitizedBase = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `directives/${Date.now()}_${sanitizedBase}`;
            const mimeType = file.type || "application/pdf";

            const uploadedUrl = await uploadFile(buffer, fileName, "system-assets", mimeType);
            if (uploadedUrl) {
                newlyUploadedUrl = uploadedUrl;
                attachmentUrl = uploadedUrl;
                attachmentName = file.name;
                attachmentSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
            } else {
                throw new Error("Failed to upload replacement attachment.");
            }
        } else if (isFileRemoved) {
            attachmentUrl = null;
            attachmentName = null;
            attachmentSize = null;
        }

        const updated = await (prisma as any).executiveDirective.update({
            where: { id },
            data: {
                title,
                content,
                category,
                priority,
                targetScope,
                targetBarangays,
                targetBarangay,
                attachmentUrl,
                attachmentName,
                attachmentSize,
            }
        });

        // 4. STORAGE CLEANUP: Delete old file if replaced or removed
        const oldFileUrl = existing.attachmentUrl;
        if (oldFileUrl && oldFileUrl !== attachmentUrl && oldFileUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(oldFileUrl);
            } catch (delErr) {
                console.warn("Failed to delete old attachment from storage bucket:", delErr);
            }
        }

        revalidatePath("/admin/directives");
        revalidatePath("/captain/dashboard");
        revalidatePath("/mayor/directives");

        // 5. Audit Logging with Structured Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.title !== title) changes["title"] = { old: existing.title, new: title };
            if (existing.content !== content) changes["content"] = { old: existing.content, new: content };
            if (existing.category !== category) changes["category"] = { old: existing.category, new: category };
            if (existing.priority !== priority) changes["priority"] = { old: existing.priority, new: priority };
            if (existing.targetScope !== targetScope) changes["targetScope"] = { old: existing.targetScope, new: targetScope };
            if (existing.attachmentName !== attachmentName) changes["attachment"] = { old: existing.attachmentName || "None", new: attachmentName || "None" };

            await logActivity({
                action: "UPDATE",
                entityType: "ExecutiveDirective",
                entityId: id,
                entityName: updated.title,
                description: `Updated Executive Directive: "${updated.title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    title: updated.title,
                    priority: updated.priority
                }
            });
        } catch (auditErr) {
            console.warn("[updateExecutiveDirective] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating executive directive:", error);

        // 4. STORAGE ROLLBACK: If new file uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateExecutiveDirective] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to update directive." };
    }
}

/**
 * GET EXECUTIVE DIRECTIVE BY ID (With Read Receipts)
 */
export async function getExecutiveDirectiveById(id: string) {
    try {
        await verifyDirectivesAccess();

        const directive = await (prisma as any).executiveDirective.findUnique({
            where: { id },
            include: {
                reads: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                managedBarangay: true,
                                role: true,
                            }
                        }
                    },
                    orderBy: { readAt: "desc" }
                }
            }
        });

        if (!directive) {
            return { success: false, error: "Directive not found." };
        }

        return {
            success: true,
            data: {
                id: directive.id,
                title: directive.title,
                content: directive.content,
                category: directive.category,
                priority: directive.priority,
                targetScope: directive.targetScope,
                targetBarangay: directive.targetBarangay,
                targetBarangays: directive.targetBarangays || [],
                attachmentUrl: directive.attachmentUrl,
                attachmentName: directive.attachmentName,
                attachmentSize: directive.attachmentSize,
                senderName: directive.senderName || "Office of the Municipal Mayor",
                createdAt: directive.createdAt.toISOString(),
                reads: (directive.reads || []).map((r: any) => ({
                    id: r.id,
                    userId: r.userId,
                    userName: r.user?.name || "Barangay Official",
                    userEmail: r.user?.email,
                    managedBarangay: r.user?.managedBarangay || "Unassigned",
                    readAt: r.readAt.toISOString(),
                }))
            }
        };
    } catch (error: any) {
        console.error("Error fetching directive by ID:", error);
        return { success: false, error: error.message || "Failed to load directive details." };
    }
}

/**
 * DELETE EXECUTIVE DIRECTIVE + ATTACHMENT CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteExecutiveDirective(id: string) {
    try {
        await verifyDirectivesAccess();

        const existing = await (prisma as any).executiveDirective.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Directive not found." };
        }

        // Automatic File Cleanup: Delete attachment from storage bucket if present
        if (existing.attachmentUrl && existing.attachmentUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.attachmentUrl);
            } catch (err) {
                console.warn("Failed to delete attachment from bucket:", err);
            }
        }

        await (prisma as any).executiveDirective.delete({
            where: { id }
        });

        revalidatePath("/admin/directives");
        revalidatePath("/captain/dashboard");
        revalidatePath("/mayor/directives");

        // 5. Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "ExecutiveDirective",
                entityId: id,
                entityName: existing.title,
                description: `Deleted Executive Directive: "${existing.title}"`,
                metadata: {
                    title: existing.title,
                    priority: existing.priority,
                    category: existing.category,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        title: existing.title,
                        content: existing.content,
                        category: existing.category,
                        priority: existing.priority,
                        targetScope: existing.targetScope,
                        targetBarangay: existing.targetBarangay,
                        targetBarangays: existing.targetBarangays,
                        attachmentUrl: existing.attachmentUrl,
                        attachmentName: existing.attachmentName,
                        senderName: existing.senderName,
                        createdAt: existing.createdAt,
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteExecutiveDirective] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting executive directive:", error);
        return { success: false, error: error.message || "Failed to delete directive." };
    }
}
