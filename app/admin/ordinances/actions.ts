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
 * Enforces role checking: ADMIN (LGU), CONTENT_ADMIN, or custom accessiblePages
 */
async function verifyLegislativeAccess(): Promise<SessionUser> {
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
    const hasPageAccess = accessiblePages.includes("/admin/ordinances");

    if (!isLguAdmin && !isContentAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage legislative documents.");
    }

    return user;
}

interface CachedDocuments {
    documents: any[];
    totalCount: number;
    expiresAt: number;
}

const _docCache = new Map<string, CachedDocuments>();
let _cachedTags: { tags: string[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // Cache for 60 seconds

function clearCache() {
    _docCache.clear();
    _cachedTags = null;
}

/**
 * GET LEGISLATIVE DOCUMENTS (Paginated & Filtered)
 */
export async function getLegislativeDocuments(options: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    status?: string;
}) {
    try {
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.max(1, options.pageSize || 10);
        const search = options.search || "";
        const type = options.type || "ALL";
        const status = options.status || "ALL";

        const cacheKey = JSON.stringify({ page, pageSize, search, type, status });
        const now = Date.now();
        const cached = _docCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return { success: true, data: cached.documents, totalCount: cached.totalCount };
        }

        const where: any = {};

        if (type !== "ALL") {
            where.type = type;
        }

        if (status !== "ALL") {
            where.status = status;
        }

        if (search.trim()) {
            where.OR = [
                { title: { contains: search.trim(), mode: "insensitive" } },
                { referenceNumber: { contains: search.trim(), mode: "insensitive" } },
                { description: { contains: search.trim(), mode: "insensitive" } },
                { tags: { has: search.trim().toUpperCase() } },
            ];
        }

        const [documents, totalCount] = await Promise.all([
            (prisma as any).legislativeDocument.findMany({
                where,
                select: {
                    id: true,
                    type: true,
                    referenceNumber: true,
                    title: true,
                    description: true,
                    tags: true,
                    dateApproved: true,
                    status: true,
                    pdfUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { dateApproved: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            (prisma as any).legislativeDocument.count({ where }),
        ]);

        _docCache.set(cacheKey, {
            documents,
            totalCount,
            expiresAt: now + CACHE_TTL_MS,
        });

        return { success: true, data: documents, totalCount };
    } catch (error: any) {
        console.error("Error fetching legislative documents:", error);
        return { success: false, error: error.message || "Failed to fetch documents" };
    }
}

/**
 * GET SINGLE LEGISLATIVE DOCUMENT BY ID
 */
export async function getLegislativeDocumentById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Document ID is required." };
        }

        await verifyLegislativeAccess();

        const document = await (prisma as any).legislativeDocument.findUnique({
            where: { id },
            select: {
                id: true,
                type: true,
                referenceNumber: true,
                title: true,
                description: true,
                tags: true,
                dateApproved: true,
                status: true,
                pdfUrl: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!document) {
            return { success: false, error: "Document record not found." };
        }

        return { success: true, data: document, document };
    } catch (error: any) {
        console.error("[getLegislativeDocumentById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch document details." };
    }
}

/**
 * CREATE LEGISLATIVE DOCUMENT + STORAGE ROLLBACK + AUDIT LOGGING
 */
export async function createLegislativeDocument(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        await verifyLegislativeAccess();

        const type = (formData.get("type") as string)?.trim();
        const referenceNumber = (formData.get("referenceNumber") as string)?.trim();
        const title = (formData.get("title") as string)?.trim();
        const description = (formData.get("description") as string)?.trim();
        const tagsString = (formData.get("tags") as string)?.trim();
        const dateApprovedVal = formData.get("dateApproved") as string;
        const status = (formData.get("status") as string)?.trim() || "ENACTED";
        const file = formData.get("file") as File | null;

        if (!type || !["ORDINANCE", "RESOLUTION"].includes(type)) {
            return { success: false, error: "Valid document type is required" };
        }
        if (!referenceNumber) {
            return { success: false, error: "Reference number is required" };
        }
        if (!title) {
            return { success: false, error: "Title is required" };
        }
        if (!description) {
            return { success: false, error: "Description is required" };
        }
        if (!dateApprovedVal) {
            return { success: false, error: "Date approved is required" };
        }

        const tags = tagsString
            ? tagsString.split(",").map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
            : [];

        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'pdf';
            const fileName = `legislative-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const uploadPath = `legislative-documents/${fileName}`;
            
            newlyUploadedUrl = await uploadFile(buffer, uploadPath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload file to storage bucket." };
            }
        }

        const document = await (prisma as any).legislativeDocument.create({
            data: {
                type,
                referenceNumber,
                title,
                description,
                tags,
                dateApproved: new Date(dateApprovedVal),
                status,
                pdfUrl: newlyUploadedUrl,
            },
        });

        clearCache();
        revalidatePath("/admin/ordinances");
        revalidatePath("/ordinances");
        revalidatePath("/");

        // 5. Audit Logging for Creation
        try {
            await logActivity({
                action: "CREATE",
                entityType: "LegislativeDocument",
                entityId: document.id,
                entityName: `${type} ${referenceNumber}`,
                description: `Published ${type}: "${referenceNumber} - ${title}"`,
                metadata: {
                    type,
                    referenceNumber,
                    title,
                    status,
                    tags,
                    dateApproved: new Date(dateApprovedVal).toISOString(),
                    pdfUrl: newlyUploadedUrl
                }
            });
        } catch (auditErr) {
            console.warn("[createLegislativeDocument] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: document };
    } catch (error: any) {
        console.error("Error creating legislative document:", error);

        // 4. STORAGE ROLLBACK: If file was uploaded but DB create failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createLegislativeDocument] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to create document" };
    }
}

/**
 * UPDATE LEGISLATIVE DOCUMENT + FILE CLEANUP + STORAGE ROLLBACK + STATE DIFF AUDIT
 */
export async function updateLegislativeDocument(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        if (!id) {
            return { success: false, error: "Document ID is required." };
        }

        await verifyLegislativeAccess();

        const existing = await (prisma as any).legislativeDocument.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Document not found" };
        }

        const type = (formData.get("type") as string)?.trim() || existing.type;
        const referenceNumber = (formData.get("referenceNumber") as string)?.trim() || existing.referenceNumber;
        const title = (formData.get("title") as string)?.trim() || existing.title;
        const description = (formData.get("description") as string)?.trim() || existing.description;
        const tagsString = (formData.get("tags") as string)?.trim();
        const dateApprovedVal = formData.get("dateApproved") as string;
        const status = (formData.get("status") as string)?.trim() || existing.status;
        const isFileRemoved = formData.get("fileRemoved") === "true";
        const file = formData.get("file") as File | null;

        // Parse date preservation to prevent timezone shifts
        const existingDateFormatted = existing.dateApproved ? new Date(new Date(existing.dateApproved).getTime() - (new Date(existing.dateApproved).getTimezoneOffset() * 60000)).toISOString().slice(0, 10) : "";
        const dateApproved = !dateApprovedVal ? existing.dateApproved : (dateApprovedVal === existingDateFormatted ? existing.dateApproved : new Date(dateApprovedVal));

        // Upload replacement file if provided
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'pdf';
            const fileName = `legislative-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const uploadPath = `legislative-documents/${fileName}`;
            
            newlyUploadedUrl = await uploadFile(buffer, uploadPath, undefined, file.type);
            if (!newlyUploadedUrl) {
                return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
            }
        }

        let finalPdfUrl = existing.pdfUrl;
        if (newlyUploadedUrl) {
            finalPdfUrl = newlyUploadedUrl;
        } else if (isFileRemoved) {
            finalPdfUrl = null;
        }

        const tags = tagsString !== undefined && tagsString !== null
            ? tagsString.split(",").map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
            : existing.tags;

        const updated = await (prisma as any).legislativeDocument.update({
            where: { id },
            data: {
                type,
                referenceNumber,
                title,
                description,
                tags,
                dateApproved,
                status,
                pdfUrl: finalPdfUrl,
            },
        });

        // 4. STORAGE CLEANUP: If file was replaced or removed, delete the old file
        const oldPdfUrl = existing.pdfUrl;
        if (oldPdfUrl && oldPdfUrl !== finalPdfUrl && oldPdfUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(oldPdfUrl);
            } catch (delErr) {
                console.warn("Failed to delete old file from storage bucket:", delErr);
            }
        }

        clearCache();
        revalidatePath("/admin/ordinances");
        revalidatePath("/ordinances");
        revalidatePath("/");

        // 5. Audit Logging with Structured State Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.type !== type) changes["type"] = { old: existing.type, new: type };
            if (existing.referenceNumber !== referenceNumber) changes["referenceNumber"] = { old: existing.referenceNumber, new: referenceNumber };
            if (existing.title !== title) changes["title"] = { old: existing.title, new: title };
            if (existing.description !== description) changes["description"] = { old: existing.description, new: description };
            if (existing.status !== status) changes["status"] = { old: existing.status, new: status };
            if (existing.pdfUrl !== finalPdfUrl) changes["pdfUrl"] = { old: existing.pdfUrl || "None", new: finalPdfUrl || "None" };

            // Check tags diff
            const oldTags = Array.isArray(existing.tags) ? existing.tags : [];
            if (JSON.stringify(oldTags) !== JSON.stringify(tags)) {
                changes["tags"] = { old: oldTags.join(", ") || "None", new: tags.join(", ") || "None" };
            }

            // Check epoch timestamp diff
            const oldDateTime = existing.dateApproved ? new Date(existing.dateApproved).getTime() : 0;
            const newDateTime = dateApproved ? new Date(dateApproved).getTime() : 0;
            if (Math.abs(oldDateTime - newDateTime) > 1000) {
                changes["dateApproved"] = {
                    old: existing.dateApproved ? new Date(existing.dateApproved).toISOString().split("T")[0] : "None",
                    new: dateApproved ? new Date(dateApproved).toISOString().split("T")[0] : "None"
                };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "LegislativeDocument",
                entityId: id,
                entityName: `${updated.type} ${updated.referenceNumber}`,
                description: `Updated ${updated.type}: "${updated.referenceNumber} - ${updated.title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    type: updated.type,
                    referenceNumber: updated.referenceNumber,
                }
            });
        } catch (auditErr) {
            console.warn("[updateLegislativeDocument] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating legislative document:", error);

        // 4. STORAGE ROLLBACK: If new file uploaded but DB update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateLegislativeDocument] Storage rollback failed:", cleanupErr);
            }
        }

        return { success: false, error: error.message || "Failed to update document" };
    }
}

/**
 * DELETE LEGISLATIVE DOCUMENT + FILE CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteLegislativeDocument(id: string) {
    try {
        await verifyLegislativeAccess();

        const existing = await (prisma as any).legislativeDocument.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Document not found" };
        }

        // Automatic File Cleanup: Delete attached file from storage bucket if exists
        if (existing.pdfUrl && existing.pdfUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.pdfUrl);
            } catch (delErr) {
                console.warn("[deleteLegislativeDocument] Failed to delete file from storage bucket:", delErr);
            }
        }

        await (prisma as any).legislativeDocument.delete({
            where: { id },
        });

        clearCache();
        revalidatePath("/admin/ordinances");
        revalidatePath("/ordinances");
        revalidatePath("/");

        // 5. Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "LegislativeDocument",
                entityId: id,
                entityName: `${existing.type} ${existing.referenceNumber}`,
                description: `Deleted ${existing.type}: "${existing.referenceNumber} - ${existing.title}"`,
                metadata: {
                    type: existing.type,
                    referenceNumber: existing.referenceNumber,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        type: existing.type,
                        referenceNumber: existing.referenceNumber,
                        title: existing.title,
                        description: existing.description,
                        tags: existing.tags,
                        dateApproved: existing.dateApproved,
                        status: existing.status,
                        pdfUrl: existing.pdfUrl,
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteLegislativeDocument] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting legislative document:", error);
        return { success: false, error: error.message || "Failed to delete document" };
    }
}

/**
 * GET ALL CATEGORY TAGS
 */
export async function getAllCategoryTags(): Promise<string[]> {
    try {
        const now = Date.now();
        if (_cachedTags && _cachedTags.expiresAt > now) {
            return _cachedTags.tags;
        }

        const docs = await (prisma as any).legislativeDocument.findMany({
            select: { tags: true },
        });
        const allTags: string[] = docs.flatMap((d: any) => d.tags || []);
        const unique = Array.from(new Set(allTags.map(t => t.trim().toUpperCase()))).filter(Boolean).sort();

        _cachedTags = {
            tags: unique,
            expiresAt: now + CACHE_TTL_MS
        };

        return unique;
    } catch (error) {
        console.error("Error getting category tags:", error);
        return [];
    }
}
