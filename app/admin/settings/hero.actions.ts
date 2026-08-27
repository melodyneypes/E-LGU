"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { logActivity } from "@/lib/audit";

/**
 * 1. SECURITY & PERMISSIONS:
 * Verify that user is either:
 * - Municipal LGU Admin (ADMIN with LGU or assigned /admin/settings)
 * - Barangay Admin (BARANGAY_ADMIN with managedBarangay)
 */
async function verifyHeroSlideAccess() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;
    const currentUserRole = currentUser?.role;
    const currentDepartment = currentUser?.department;
    const accessiblePages = (currentUser?.accessiblePages || []) as string[];
    const managedBarangay = currentUser?.managedBarangay;

    const isLguAdmin = currentUserRole === "ADMIN" && currentDepartment === "LGU";
    const isAssignedAdmin = currentUserRole === "ADMIN" && accessiblePages.some(page => 
        page === "/admin/settings" || 
        page.startsWith("/admin/settings")
    );
    const isBarangayAdmin = currentUserRole === "BARANGAY_ADMIN";

    if (!session?.user?.id || (!isLguAdmin && !isAssignedAdmin && !isBarangayAdmin)) {
        throw new Error("Unauthorized: Access denied.");
    }

    return {
        user: session.user,
        role: currentUserRole,
        isBarangayAdmin,
        managedBarangay: isBarangayAdmin ? managedBarangay : null
    };
}

/**
 * Helper to safely delete an old image file from storage bucket
 */
async function deleteOldStorageImage(fileUrl: string | null | undefined) {
    if (!fileUrl) return;
    try {
        await deleteFileByUrl(fileUrl);
    } catch (err) {
        console.warn("[deleteOldStorageImage] Failed to delete image from bucket:", err);
    }
}

/**
 * 2. FAST & LEAN CRUD: Fetch all slides scoped to caller
 */
export async function getHeroSlides() {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyHeroSlideAccess();

        const slides = await prisma.heroSlide.findMany({
            where: isBarangayAdmin ? { barangay: managedBarangay } : { barangay: null },
            select: {
                id: true,
                title: true,
                subtitle: true,
                tagline: true,
                imageUrl: true,
                primaryBtnText: true,
                primaryBtnLink: true,
                order: true,
                isActive: true,
                barangay: true,
                createdAt: true,
            },
            orderBy: [
                { createdAt: "desc" },
                { id: "desc" }
            ]
        });

        return { success: true, slides };
    } catch (error: any) {
        console.error("[getHeroSlides] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch hero slides." };
    }
}

/**
 * 2. CREATE HERO SLIDE + 3. ERROR ROLLBACK + 4. STORAGE ROLLBACK + 5. AUDIT TRAIL
 */
export async function createHeroSlide(formData: FormData) {
    let newlyUploadedUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyHeroSlideAccess();

        const title = (formData.get("title") as string)?.trim() || "";
        const subtitle = (formData.get("subtitle") as string)?.trim() || "";
        const tagline = (formData.get("tagline") as string)?.trim() || "";
        const manualImageUrl = (formData.get("imageUrl") as string)?.trim() || "";
        const primaryBtnText = (formData.get("primaryBtnText") as string)?.trim() || "";
        const primaryBtnLink = (formData.get("primaryBtnLink") as string)?.trim() || "";
        const order = parseInt(formData.get("order") as string) || 0;
        const isActive = formData.get("isActive") === "true";

        const file = (formData.get("heroSlide") || formData.get("imageFile") || formData.get("file")) as File | null;

        // Upload file to bucket if provided
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `hero-${Date.now()}.${ext}`;
            const storagePath = `banners/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload slide image to cloud storage bucket.");
            }
        }

        const finalImageUrl = newlyUploadedUrl || manualImageUrl || "";

        // Database insert
        const newSlide = await prisma.heroSlide.create({
            data: {
                title,
                subtitle,
                tagline,
                imageUrl: finalImageUrl,
                primaryBtnText,
                primaryBtnLink,
                order,
                isActive,
                barangay: isBarangayAdmin ? managedBarangay : null,
            } as any
        });

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // 5. Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "HeroCarousel",
                entityId: newSlide.id,
                entityName: title || "Hero Slide Banner",
                description: `Created hero banner slide: "${title || "Untitled"}"`,
                metadata: {
                    title,
                    subtitle,
                    tagline,
                    order,
                    isActive,
                    barangay: isBarangayAdmin ? managedBarangay : "Global Municipal",
                    hasImage: !!finalImageUrl
                }
            });
        } catch (auditErr) {
            console.warn("[createHeroSlide] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, slide: newSlide };
    } catch (error: any) {
        console.error("[createHeroSlide] Error:", error);

        // Storage Rollback: Clean up newly uploaded image if database insert failed
        if (newlyUploadedUrl) {
            await deleteOldStorageImage(newlyUploadedUrl);
        }

        return { 
            success: false, 
            error: error?.message || "Failed to create hero slide. Please try again." 
        };
    }
}

/**
 * 2. UPDATE HERO SLIDE + 3. ERROR ROLLBACK + 4. OLD IMAGE DELETION & STORAGE ROLLBACK + 5. AUDIT TRAIL
 */
export async function updateHeroSlide(id: string, formData: FormData) {
    let newlyUploadedUrl: string | null = null;
    let oldImageUrl: string | null = null;

    try {
        const { isBarangayAdmin, managedBarangay } = await verifyHeroSlideAccess();

        const oldSlide = await prisma.heroSlide.findUnique({
            where: { id }
        });

        if (!oldSlide) {
            return { success: false, error: "Hero slide not found." };
        }

        // Security check for Barangay Admin scoping
        if (isBarangayAdmin && oldSlide.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized: You can only edit your own barangay's slides." };
        }

        oldImageUrl = oldSlide.imageUrl || null;

        const title = (formData.get("title") as string)?.trim() ?? oldSlide.title;
        const subtitle = (formData.get("subtitle") as string)?.trim() ?? oldSlide.subtitle;
        const tagline = (formData.get("tagline") as string)?.trim() ?? oldSlide.tagline;
        const manualImageUrl = formData.get("imageUrl") as string;
        const primaryBtnText = (formData.get("primaryBtnText") as string)?.trim() ?? oldSlide.primaryBtnText;
        const primaryBtnLink = (formData.get("primaryBtnLink") as string)?.trim() ?? oldSlide.primaryBtnLink;
        const order = formData.get("order") !== null ? (parseInt(formData.get("order") as string) || 0) : oldSlide.order;
        const isActive = formData.get("isActive") !== null ? (formData.get("isActive") === "true") : oldSlide.isActive;

        const file = (formData.get("heroSlide") || formData.get("imageFile") || formData.get("file")) as File | null;

        // Upload new file if provided
        if (file && file.size > 0 && file.name !== "undefined") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `hero-${Date.now()}.${ext}`;
            const storagePath = `banners/${filename}`;

            newlyUploadedUrl = await uploadFile(buffer, storagePath, undefined, file.type);
            if (!newlyUploadedUrl) {
                throw new Error("Failed to upload updated slide image to storage.");
            }
        }

        const finalImageUrl = newlyUploadedUrl || (manualImageUrl !== undefined ? manualImageUrl.trim() : oldSlide.imageUrl);

        // Perform Database Update
        const updatedSlide = await prisma.heroSlide.update({
            where: { id },
            data: {
                title,
                subtitle,
                tagline,
                imageUrl: finalImageUrl,
                primaryBtnText,
                primaryBtnLink,
                order,
                isActive,
            }
        });

        // If update succeeded and a new image replaced an old image in bucket, safely delete old image
        if (oldImageUrl && newlyUploadedUrl && oldImageUrl !== newlyUploadedUrl) {
            await deleteOldStorageImage(oldImageUrl);
        }

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // 5. Audit Logging with Changes Diff
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (oldSlide.title !== title) changes["title"] = { old: oldSlide.title, new: title };
            if (oldSlide.subtitle !== subtitle) changes["subtitle"] = { old: oldSlide.subtitle, new: subtitle };
            if (oldSlide.tagline !== tagline) changes["tagline"] = { old: oldSlide.tagline, new: tagline };
            if (oldSlide.imageUrl !== finalImageUrl) changes["imageUrl"] = { old: oldSlide.imageUrl || "None", new: finalImageUrl || "None" };
            if (oldSlide.isActive !== isActive) changes["isActive"] = { old: oldSlide.isActive ? "Live" : "Draft", new: isActive ? "Live" : "Draft" };

            await logActivity({
                action: "UPDATE",
                entityType: "HeroCarousel",
                entityId: id,
                entityName: title || oldSlide.title || "Hero Slide",
                description: `Updated hero banner slide: "${title || oldSlide.title}"`,
                metadata: {
                    changes,
                    changedFields: Object.keys(changes)
                }
            });
        } catch (auditErr) {
            console.warn("[updateHeroSlide] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true, slide: updatedSlide };
    } catch (error: any) {
        console.error("[updateHeroSlide] Error:", error);

        // Storage Rollback: If update failed, delete the newly uploaded image
        if (newlyUploadedUrl) {
            await deleteOldStorageImage(newlyUploadedUrl);
        }

        return { 
            success: false, 
            error: error?.message || "Failed to update hero slide. Please try again." 
        };
    }
}

/**
 * 2. DELETE HERO SLIDE + 4. BUCKET IMAGE DELETION + 5. AUDIT LOGGING
 */
export async function deleteHeroSlide(id: string) {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyHeroSlideAccess();

        const slide = await prisma.heroSlide.findUnique({
            where: { id }
        });

        if (!slide) {
            return { success: false, error: "Hero slide not found or already deleted." };
        }

        // Security check for Barangay Admin scoping
        if (isBarangayAdmin && slide.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized: You can only delete your own barangay's slides." };
        }

        // Delete associated image in storage bucket
        if (slide.imageUrl) {
            await deleteOldStorageImage(slide.imageUrl);
        }

        // Delete from database
        await prisma.heroSlide.delete({
            where: { id }
        });

        revalidatePath("/");
        revalidatePath("/admin/settings");

        // 5. Audit Logging with Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "HeroCarousel",
                entityId: id,
                entityName: slide.title || "Hero Slide",
                description: `Deleted hero banner slide: "${slide.title || id}"`,
                metadata: {
                    deletedRecordSnapshot: {
                        id: slide.id,
                        title: slide.title,
                        subtitle: slide.subtitle,
                        tagline: slide.tagline,
                        imageUrl: slide.imageUrl,
                        order: slide.order,
                        barangay: slide.barangay || "Global Municipal"
                    }
                }
            });
        } catch (auditErr) {
            console.warn("[deleteHeroSlide] Audit log warning (non-blocking):", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteHeroSlide] Error:", error);
        return { 
            success: false, 
            error: error?.message || "Failed to delete hero slide. Please try again." 
        };
    }
}
