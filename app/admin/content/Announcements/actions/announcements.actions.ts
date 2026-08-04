"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";
import { sendRHUAnnouncementNotification } from "@/lib/services/fcm";

export type ActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    announcement?: T;
    error?: string;
};

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    managedBarangay?: string;
}

/**
 * Helper to get user session and enforce authentication + authorization guards.
 */
async function getAuthenticatedUser(): Promise<{ user: SessionUser | null; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return { user: null, error: "Unauthorized access. Please sign in." };
        }
        
        const user = session.user as SessionUser;
        const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF", "RHU_CENTER_ADMIN", "RHU_DOCTOR", "RHU_STAFF", "RHU_ADMIN"];
        if (user.role && !allowedRoles.includes(user.role)) {
            return { user: null, error: "Forbidden: You do not have administrative privileges." };
        }

        return { user };
    } catch (err) {
        console.error("[Auth Guard Error]:", err);
        return { user: null, error: "Authentication check failed." };
    }
}

/**
 * Helper to check if user owns the announcement or is global super admin.
 */
async function checkOwnershipGuard(user: SessionUser, existing: any): Promise<{ allowed: boolean; error?: string }> {
    const userEmail = (user.email || "").toLowerCase();
    const matchedCenter = await getMatchedCenterForUser(user);
    const isSuperAdmin = (user.role === "ADMIN" || user.role === "RHU_ADMIN") && !matchedCenter && !userEmail.includes("lalas") && !userEmail.includes("main");

    if (isSuperAdmin || user.role === "RHU_ADMIN") {
        return { allowed: true };
    }

    if (user.role === "BARANGAY_ADMIN") {
        if (existing.barangay && existing.barangay !== user.managedBarangay) {
            return { allowed: false, error: "Forbidden: You cannot modify announcements outside your barangay." };
        }
        return { allowed: true };
    }

    const existingAuthorEmail = (existing.authorEmail || "").toLowerCase();
    const isOwner =
        (existing.authorId && user.id && String(existing.authorId) === String(user.id)) ||
        (existingAuthorEmail && existingAuthorEmail === userEmail) ||
        (matchedCenter && existing.healthCenterId && String(existing.healthCenterId) === String(matchedCenter.id));

    if (!isOwner) {
        return {
            allowed: false,
            error: "Forbidden: You can only edit or modify announcements created by your center."
        };
    }

    return { allowed: true };
}

/**
 * Helper to verify that the Prisma announcement delegate is ready.
 */
function getAnnouncementDelegate() {
    const delegate = (prisma as any).announcement;
    if (!delegate) {
        throw new Error("Database model 'announcement' is not available.");
    }
    return delegate;
}

/**
 * GET SINGLE ANNOUNCEMENT BY ID (Full details on-demand)
 */
export async function getAnnouncementById(id: string): Promise<ActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Announcement ID is required." };
        }

        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        let announcement;
        try {
            announcement = await announcementDelegate.findUnique({
                where: { id },
            });
        } catch (err: any) {
            console.warn("[getAnnouncementById warning]: findUnique failed, using fallback query", err?.message);
            const rows = await (prisma as any).$queryRawUnsafe(`SELECT * FROM "Announcement" WHERE id = $1 LIMIT 1`, id);
            announcement = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        }

        if (!announcement) {
            return { success: false, error: "Announcement not found." };
        }

        if (user.role === "BARANGAY_ADMIN" && announcement.barangay && announcement.barangay !== user.managedBarangay) {
            return { success: false, error: "Forbidden: Access denied to this barangay announcement." };
        }

        return { success: true, data: announcement, announcement };
    } catch (error) {
        console.error("[getAnnouncementById Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch announcement details.";
        return { success: false, error: errorMessage };
    }
}

/**
 * CREATE ANNOUNCEMENT
 */
export async function addAnnouncement(formData: FormData): Promise<ActionResponse> {
    try {
        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const title = (formData.get("title") as string)?.trim();
        const content = (formData.get("content") as string)?.trim();
        const category = (formData.get("category") as string)?.trim();
        const priority = (formData.get("priority") as string)?.trim();
        const expiryDate = formData.get("expiryDate") as string;
        const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
        
        // Form field validation
        if (!title || !content) {
            return { success: false, error: "Title and content are required fields." };
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (user.role === "BARANGAY_ADMIN") {
            if (!user.managedBarangay) {
                return { success: false, error: "Barangay Admin does not have an assigned barangay." };
            }
            barangay = user.managedBarangay;
        }

        const matchedCenter = await getMatchedCenterForUser(user);
        const userEmail = (user.email || "").toLowerCase();

        const announcementDelegate = getAnnouncementDelegate();
        
        const createData: Record<string, any> = {
            title,
            content,
            category: category || "General",
            priority: priority || "Normal",
            isPinned: formData.get("isPinned") === "on",
            isActive: formData.get("isActive") === "on",
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            barangay: barangay || null,
            authorId: user.id || null,
            authorEmail: userEmail || null,
            healthCenterId: matchedCenter?.id || null,
        };

        if (imageUrl) {
            createData.imageUrl = imageUrl;
        }

        let newAnnouncement;
        try {
            newAnnouncement = await announcementDelegate.create({
                data: createData,
            });
        } catch (err: any) {
            console.warn("[addAnnouncement warning]: Initial create failed, stripping author metadata for fallback", err?.message);
            delete createData.authorId;
            delete createData.authorEmail;
            delete createData.healthCenterId;
            try {
                newAnnouncement = await announcementDelegate.create({
                    data: createData,
                });
            } catch {
                delete createData.imageUrl;
                newAnnouncement = await announcementDelegate.create({
                    data: createData,
                });
            }
        }

        revalidatePath("/admin/announcements");
        revalidatePath("/admin/rhu/announcements");
        revalidatePath("/");

        // Send FCM Push Notification to Flutter mobile app users
        const isHealthOrRHU =
            category?.toLowerCase().includes("health") ||
            category?.toLowerCase().includes("rhu") ||
            user.role === "RHU_ADMIN" ||
            user.role === "RHU_CENTER_ADMIN" ||
            user.role === "RHU_DOCTOR" ||
            Boolean(matchedCenter);

        if (isHealthOrRHU && newAnnouncement) {
            try {
                await sendRHUAnnouncementNotification(
                    String(newAnnouncement.title || title || "RHU Health Advisory"),
                    String(newAnnouncement.content || content || ""),
                    { announcementId: String(newAnnouncement.id || "") }
                );
            } catch (fcmErr) {
                console.error("[FCM Broadcast Error]:", fcmErr);
            }
        }

        return { success: true, announcement: newAnnouncement };
    } catch (error) {
        console.error("[addAnnouncement Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create announcement.";
        return { success: false, error: errorMessage };
    }
}

/**
 * UPDATE ANNOUNCEMENT
 */
export async function updateAnnouncement(id: string, formData: FormData): Promise<ActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Announcement ID is required for update." };
        }

        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const title = (formData.get("title") as string)?.trim();
        const content = (formData.get("content") as string)?.trim();
        const category = (formData.get("category") as string)?.trim();
        const priority = (formData.get("priority") as string)?.trim();
        const expiryDate = formData.get("expiryDate") as string;
        const imageUrl = (formData.get("imageUrl") as string)?.trim();

        if (!title || !content) {
            return { success: false, error: "Title and content cannot be empty." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        const existing = await announcementDelegate.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Announcement not found." };
        }

        const guard = await checkOwnershipGuard(user, existing);
        if (!guard.allowed) {
            return { success: false, error: guard.error || "Forbidden" };
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
        if (barangay === "ALL" || barangay === "All") {
            barangay = null;
        }
        if (user.role === "BARANGAY_ADMIN") {
            barangay = user.managedBarangay || null;
        }

        const updateData: Record<string, any> = {
            title,
            content,
            category: category || "General",
            priority: priority || "Normal",
            isPinned: formData.get("isPinned") === "on",
            isActive: formData.get("isActive") === "on",
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            barangay: barangay || null,
        };

        if (imageUrl !== undefined) {
            updateData.imageUrl = imageUrl || null;
        }

        let updated;
        try {
            updated = await announcementDelegate.update({
                where: { id },
                data: updateData,
            });
        } catch (err: any) {
            console.warn("[updateAnnouncement warning]: Initial update failed, stripping author metadata for fallback", err?.message);
            delete updateData.authorId;
            delete updateData.authorEmail;
            delete updateData.healthCenterId;
            try {
                updated = await announcementDelegate.update({
                    where: { id },
                    data: updateData,
                });
            } catch {
                delete updateData.imageUrl;
                updated = await announcementDelegate.update({
                    where: { id },
                    data: updateData,
                });
            }
        }

        revalidatePath("/admin/announcements");
        revalidatePath("/admin/rhu/announcements");
        revalidatePath("/");
        return { success: true, announcement: updated };
    } catch (error) {
        console.error("[updateAnnouncement Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update announcement.";
        return { success: false, error: errorMessage };
    }
}

/**
 * DELETE ANNOUNCEMENT
 */
export async function deleteAnnouncement(id: string): Promise<ActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Announcement ID is required for deletion." };
        }

        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        const existing = await announcementDelegate.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Announcement not found." };
        }

        const guard = await checkOwnershipGuard(user, existing);
        if (!guard.allowed) {
            return { success: false, error: guard.error || "Forbidden" };
        }

        await announcementDelegate.delete({ where: { id } });
        revalidatePath("/admin/announcements");
        revalidatePath("/admin/rhu/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[deleteAnnouncement Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to delete announcement.";
        return { success: false, error: errorMessage };
    }
}

/**
 * TOGGLE ACTIVE STATUS
 */
export async function toggleAnnouncementStatus(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Announcement ID is required." };
        }

        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        const existing = await announcementDelegate.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Announcement not found." };
        }

        const guard = await checkOwnershipGuard(user, existing);
        if (!guard.allowed) {
            return { success: false, error: guard.error || "Forbidden" };
        }

        await announcementDelegate.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/announcements");
        revalidatePath("/admin/rhu/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[toggleAnnouncementStatus Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update status.";
        return { success: false, error: errorMessage };
    }
}

/**
 * TOGGLE PIN STATUS
 */
export async function toggleAnnouncementPin(id: string, isPinned: boolean): Promise<ActionResponse> {
    try {
        if (!id) {
            return { success: false, error: "Announcement ID is required." };
        }

        const { user, error: authError } = await getAuthenticatedUser();
        if (authError || !user) {
            return { success: false, error: authError || "Unauthorized access." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        const existing = await announcementDelegate.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Announcement not found." };
        }

        const guard = await checkOwnershipGuard(user, existing);
        if (!guard.allowed) {
            return { success: false, error: guard.error || "Forbidden" };
        }

        await announcementDelegate.update({ where: { id }, data: { isPinned } });
        revalidatePath("/admin/announcements");
        revalidatePath("/admin/rhu/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[toggleAnnouncementPin Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update pin status.";
        return { success: false, error: errorMessage };
    }
}
