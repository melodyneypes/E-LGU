"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    announcement?: T;
    error?: string;
};

interface SessionUser {
    id?: string;
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
        const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
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
        const announcement = await announcementDelegate.findUnique({
            where: { id },
        });

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
        
        // Form field validation
        if (!title || !content) {
            return { success: false, error: "Title and content are required fields." };
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
        if (user.role === "BARANGAY_ADMIN") {
            if (!user.managedBarangay) {
                return { success: false, error: "Barangay Admin does not have an assigned barangay." };
            }
            barangay = user.managedBarangay;
        }

        const announcementDelegate = getAnnouncementDelegate();
        const newAnnouncement = await announcementDelegate.create({
            data: {
                title,
                content,
                category: category || "General",
                priority: priority || "Normal",
                isPinned: formData.get("isPinned") === "on",
                isActive: formData.get("isActive") === "on",
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/announcements");
        revalidatePath("/");
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

        if (!title || !content) {
            return { success: false, error: "Title and content cannot be empty." };
        }

        const announcementDelegate = getAnnouncementDelegate();
        
        // Scope check for Barangay Admin
        if (user.role === "BARANGAY_ADMIN") {
            const existing = await announcementDelegate.findUnique({ where: { id } });
            if (!existing) {
                return { success: false, error: "Announcement not found." };
            }
            if (existing.barangay && existing.barangay !== user.managedBarangay) {
                return { success: false, error: "Forbidden: You cannot modify announcements outside your barangay." };
            }
        }

        let barangay = (formData.get("barangay") as string)?.trim() || null;
        if (user.role === "BARANGAY_ADMIN") {
            barangay = user.managedBarangay || null;
        }

        const updated = await announcementDelegate.update({
            where: { id },
            data: {
                title,
                content,
                category: category || "General",
                priority: priority || "Normal",
                isPinned: formData.get("isPinned") === "on",
                isActive: formData.get("isActive") === "on",
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/announcements");
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

        if (user.role === "BARANGAY_ADMIN") {
            const existing = await announcementDelegate.findUnique({ where: { id } });
            if (!existing) {
                return { success: false, error: "Announcement not found." };
            }
            if (existing.barangay && existing.barangay !== user.managedBarangay) {
                return { success: false, error: "Forbidden: You cannot delete announcements outside your barangay." };
            }
        }

        await announcementDelegate.delete({ where: { id } });
        revalidatePath("/admin/announcements");
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

        if (user.role === "BARANGAY_ADMIN") {
            const existing = await announcementDelegate.findUnique({ where: { id } });
            if (!existing) {
                return { success: false, error: "Announcement not found." };
            }
            if (existing.barangay && existing.barangay !== user.managedBarangay) {
                return { success: false, error: "Forbidden: You cannot modify status outside your barangay." };
            }
        }

        await announcementDelegate.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/announcements");
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

        if (user.role === "BARANGAY_ADMIN") {
            const existing = await announcementDelegate.findUnique({ where: { id } });
            if (!existing) {
                return { success: false, error: "Announcement not found." };
            }
            if (existing.barangay && existing.barangay !== user.managedBarangay) {
                return { success: false, error: "Forbidden: You cannot modify pin status outside your barangay." };
            }
        }

        await announcementDelegate.update({ where: { id }, data: { isPinned } });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[toggleAnnouncementPin Error]:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update pin status.";
        return { success: false, error: errorMessage };
    }
}
