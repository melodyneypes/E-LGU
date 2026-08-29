"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

export type NewsActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    news?: T;
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
async function verifyNewsAccess(): Promise<{ user: SessionUser; isBarangayAdmin: boolean; managedBarangay: string | null }> {
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
    const hasPageAccess = accessiblePages.includes("/admin/news") || accessiblePages.includes("/admin/content/news");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage news articles.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: isBarangayAdmin ? user.managedBarangay || null : null,
    };
}

/**
 * GET SINGLE NEWS ARTICLE BY ID
 */
export async function getNewsById(id: string): Promise<NewsActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "News ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyNewsAccess();

        const news = await (prisma as any).news.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                content: true,
                author: true,
                category: true,
                publishDate: true,
                imageUrl: true,
                images: true,
                isPublished: true,
                barangay: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!news) {
            return { success: false, error: "News article not found." };
        }

        if (isBarangayAdmin && news.barangay && news.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: Access denied to this barangay news article." };
        }

        return { success: true, data: news, news };
    } catch (error: any) {
        console.error("[getNewsById Error]:", error);
        return { success: false, error: error?.message || "Failed to fetch news article details." };
    }
}

/**
 * 2. CREATE NEWS + 3. ERROR ROLLBACK + 4. STORAGE ROLLBACK + 5. AUDIT LOGGING
 */
export async function createNews(formData: FormData): Promise<NewsActionResponse> {
    let newlyUploadedUrl: string | null = null;
    let galleryUrls: string[] = [];

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyNewsAccess();

        const title = (formData.get("title") as string)?.trim();
        const content = (formData.get("content") as string)?.trim();
        const category = (formData.get("category") as string)?.trim() || "General";
        const author = (formData.get("author") as string)?.trim() || null;
        const publishDateStr = formData.get("publishDate") as string;
        const publishDate = publishDateStr ? new Date(publishDateStr) : new Date();
        const isPublished = formData.has("isPublished")
            ? (formData.get("isPublished") === "true" || formData.get("isPublished") === "on")
            : true;

        if (!title || !content) {
            return { success: false, error: "Title and content are required fields." };
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
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
            const filename = `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `news/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload news thumbnail to storage bucket.");
            }
        }

        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        const finalImageUrl = newlyUploadedUrl || rawImageUrl;

        // Upload additional gallery images if provided
        const newAdditionalImages = formData.getAll("newAdditionalImages") as File[];
        galleryUrls = [];
        for (let i = 0; i < newAdditionalImages.length; i++) {
            const galleryFile = newAdditionalImages[i];
            if (galleryFile && galleryFile.size > 0 && galleryFile.name !== "undefined") {
                const buffer = Buffer.from(await galleryFile.arrayBuffer());
                const ext = galleryFile.name.split('.').pop() || 'jpg';
                const filename = `news-gallery-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
                const storagePath = `news/${filename}`;

                const publicUrl = await uploadFile(buffer, storagePath, undefined, galleryFile.type);
                if (publicUrl) {
                    galleryUrls.push(publicUrl);
                }
            }
        }

        // Database insert with automatic active publish status
        const newNews = await (prisma as any).news.create({
            data: {
                title,
                content,
                author,
                category,
                publishDate,
                imageUrl: finalImageUrl,
                images: galleryUrls,
                isPublished: true,
                barangay: barangay || null,
            } as any,
        });

        // 5. Audit Trail Logging with Full Initial Metadata
        try {
            await logActivity({
                action: "CREATE",
                entityType: "News",
                entityId: newNews.id,
                entityName: title,
                description: `Published news article: "${title}" (${category})`,
                metadata: {
                    title,
                    content,
                    author: author || "Municipal Information Office",
                    category,
                    barangay: barangay || "Global Municipal",
                    publishDate: publishDate.toISOString().split("T")[0],
                    isPublished: isPublished ? "Published" : "Draft",
                    imageUrl: finalImageUrl || null
                }
            });
        } catch (auditErr) {
            console.warn("[createNews] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/news");
        revalidatePath("/news");
        revalidatePath("/");
        return { success: true, news: newNews };
    } catch (error: any) {
        console.error("[createNews Error]:", error);

        // 4. STORAGE ROLLBACK: Delete newly uploaded image if database creation failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[createNews] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }
        for (const url of galleryUrls) {
            try {
                await deleteFileByUrl(url);
            } catch (cleanupErr) {
                console.warn("[createNews] Storage rollback failed for gallery url:", url, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to create news article." };
    }
}

/**
 * UPDATE NEWS + IMAGE CLEANUP + STORAGE ROLLBACK + STATE DIFF AUDIT
 */
export async function updateNews(id: string, formData: FormData): Promise<NewsActionResponse> {
    let newlyUploadedUrl: string | null = null;
    let newGalleryUrls: string[] = [];

    try {
        if (!id) {
            return { success: false, error: "News ID is required for update." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyNewsAccess();

        const existing = await (prisma as any).news.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "News article not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify news outside your barangay." };
        }

        const title = (formData.get("title") as string)?.trim() || (existing.title as string);
        const content = (formData.get("content") as string)?.trim() || (existing.content as string);
        const category = (formData.get("category") as string)?.trim() || (existing.category as string) || "General";
        const author = (formData.get("author") as string)?.trim() || (existing.author as string | null) || null;
        const publishDateStr = formData.get("publishDate") as string;
        const publishDate = publishDateStr ? new Date(publishDateStr) : existing.publishDate;
        const isImageRemoved = formData.get("imageRemoved") === "true";
        const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;

        // Upload replacement image if provided
        const file = (formData.get("image") || formData.get("file") || formData.get("imageFile")) as File | null;
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const storagePath = `news/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload updated news image to storage bucket.");
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

        let barangay: string | null = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        } else if (!barangay) {
            barangay = (existing.barangay as string | null) || null;
        }
        if (isBarangayAdmin) {
            barangay = managedBarangay;
        }

        const existingAdditionalImages = formData.getAll("existingAdditionalImages") as string[];
        const newAdditionalImages = formData.getAll("newAdditionalImages") as File[];
        newGalleryUrls = [];

        // Upload new additional images
        for (let i = 0; i < newAdditionalImages.length; i++) {
            const galleryFile = newAdditionalImages[i];
            if (galleryFile && galleryFile.size > 0 && galleryFile.name !== "undefined") {
                const buffer = Buffer.from(await galleryFile.arrayBuffer());
                const ext = galleryFile.name.split('.').pop() || 'jpg';
                const filename = `news-gallery-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
                const storagePath = `news/${filename}`;

                const publicUrl = await uploadFile(buffer, storagePath, undefined, galleryFile.type);
                if (publicUrl) {
                    newGalleryUrls.push(publicUrl);
                }
            }
        }

        const finalGalleryUrls = [...existingAdditionalImages, ...newGalleryUrls];

        // Cleanup removed additional files from storage
        const oldGalleryUrls = (existing.images as string[]) || [];
        for (const oldUrl of oldGalleryUrls) {
            if (!existingAdditionalImages.includes(oldUrl) && oldUrl.includes("supabase.co")) {
                try {
                    await deleteFileByUrl(oldUrl);
                } catch (cleanupErr) {
                    console.warn("[updateNews] Failed to delete orphaned gallery file:", oldUrl, cleanupErr);
                }
            }
        }

        const updatePayload: Record<string, any> = {
            title,
            content,
            author,
            category,
            publishDate,
            imageUrl: finalImageUrl,
            images: finalGalleryUrls,
            barangay,
        };

        if (formData.has("isPublished")) {
            updatePayload.isPublished = formData.get("isPublished") === "true" || formData.get("isPublished") === "on";
        }

        const updatedNews = await (prisma as any).news.update({
            where: { id },
            data: updatePayload,
        });

        // 4. BUCKET CLEANUP: If image was replaced or removed, delete the old file
        const oldImageUrl = existing.imageUrl;
        if (oldImageUrl && oldImageUrl !== finalImageUrl && oldImageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(oldImageUrl);
            } catch (storageErr) {
                console.warn("[updateNews] Failed to delete old image from storage bucket:", storageErr);
            }
        }

        // 5. Audit Logging with Structured State Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.title !== title) changes["title"] = { old: existing.title, new: title };
            if (existing.content !== content) changes["content"] = { old: existing.content, new: content };
            if (existing.category !== category) changes["category"] = { old: existing.category, new: category };
            if ((existing.author || "") !== (author || "")) changes["author"] = { old: existing.author || "None", new: author || "None" };
            if (existing.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: existing.imageUrl || "None", new: finalImageUrl || "None" };

            const oldDateStr = existing.publishDate ? new Date(existing.publishDate).toISOString().split("T")[0] : "None";
            const newDateStr = publishDate ? new Date(publishDate).toISOString().split("T")[0] : "None";
            if (oldDateStr !== newDateStr) {
                changes["publishDate"] = { old: oldDateStr, new: newDateStr };
            }

            if (updatePayload.isPublished !== undefined && existing.isPublished !== updatePayload.isPublished) {
                changes["isPublished"] = {
                    old: existing.isPublished ? "Published" : "Draft",
                    new: updatePayload.isPublished ? "Published" : "Draft"
                };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "News",
                entityId: id,
                entityName: title,
                description: `Updated news article: "${title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes),
                    category
                }
            });
        } catch (auditErr) {
            console.warn("[updateNews] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/news");
        revalidatePath("/news");
        revalidatePath("/");
        return { success: true, news: updatedNews };
    } catch (error: any) {
        console.error("[updateNews Error]:", error);

        // 4. STORAGE ROLLBACK: If new upload succeeded but update failed
        if (newlyUploadedUrl) {
            try {
                await deleteFileByUrl(newlyUploadedUrl);
            } catch (cleanupErr) {
                console.warn("[updateNews] Storage rollback failed for:", newlyUploadedUrl, cleanupErr);
            }
        }
        for (const url of newGalleryUrls) {
            try {
                await deleteFileByUrl(url);
            } catch (cleanupErr) {
                console.warn("[updateNews] Storage rollback failed for new gallery url:", url, cleanupErr);
            }
        }

        return { success: false, error: error?.message || "Failed to update news article." };
    }
}

/**
 * DELETE NEWS + BUCKET IMAGE CLEANUP + RECOVERY SNAPSHOT AUDIT
 */
export async function deleteNews(id: string): Promise<NewsActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "News ID is required for deletion." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyNewsAccess();

        const existing = await (prisma as any).news.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "News article not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot delete news outside your barangay." };
        }

        // Automatic Image Cleanup: Delete news image from bucket if exists
        if (existing.imageUrl && existing.imageUrl.includes("supabase.co")) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (storageErr) {
                console.warn("[deleteNews] Failed to delete image from bucket:", storageErr);
            }
        }
        const galleryUrls = (existing.images as string[]) || [];
        for (const url of galleryUrls) {
            if (url && url.includes("supabase.co")) {
                try {
                    await deleteFileByUrl(url);
                } catch (err) {
                    console.warn("[deleteNews] Failed to delete gallery image:", url, err);
                }
            }
        }

        await (prisma as any).news.delete({ where: { id } });

        // 5. Audit Logging with Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "News",
                entityId: id,
                entityName: existing.title || "News Article",
                description: `Deleted news article: "${existing.title || id}"`,
                metadata: {
                    title: existing.title,
                    deletedRecordSnapshot: {
                        id: existing.id,
                        title: existing.title,
                        category: existing.category,
                        author: existing.author || "N/A",
                        barangay: existing.barangay || "Global Municipal",
                        imageUrl: existing.imageUrl || null
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteNews] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/news");
        revalidatePath("/news");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteNews Error]:", error);
        return { success: false, error: error?.message || "Failed to delete news article." };
    }
}

/**
 * TOGGLE NEWS PUBLISH STATUS + AUDIT LOGGING
 */
export async function toggleNewsStatus(id: string, isPublished: boolean): Promise<NewsActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "News ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyNewsAccess();

        const existing = await (prisma as any).news.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "News article not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Forbidden: You cannot modify news outside your barangay." };
        }

        await (prisma as any).news.update({
            where: { id },
            data: { isPublished }
        });

        // 5. Audit Logging for Status Toggle
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "News",
                entityId: id,
                entityName: existing.title || "News Article",
                description: `${isPublished ? "Published" : "Unpublished"} news article: "${existing.title || id}"`,
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
            console.warn("[toggleNewsStatus] Audit log warning (non-blocking):", auditErr);
        }

        revalidatePath("/admin/news");
        revalidatePath("/news");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[toggleNewsStatus Error]:", error);
        return { success: false, error: error?.message || "Failed to update news status." };
    }
}
