"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getSessionBarangay(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string; managedBarangay?: string } | undefined;
    if (user?.role === "BARANGAY_ADMIN" && user.managedBarangay) {
        return user.managedBarangay;
    }
    return null;
}

export async function addAnnouncement(formData: FormData) {
    try {
        const expiryDate = formData.get("expiryDate") as string;
        const barangay = (formData.get("barangay") as string) || (await getSessionBarangay());

        const announcementDelegate = (prisma as any).announcement;
        if (!announcementDelegate) {
            return { success: false, error: "Database model 'announcement' not found." };
        }

        const newAnnouncement = await announcementDelegate.create({
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                category: formData.get("category") as string,
                priority: formData.get("priority") as string,
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
        console.error("Error creating announcement:", error);
        return { success: false, error: "Failed to create announcement." };
    }
}

export async function updateAnnouncement(id: string, formData: FormData) {
    try {
        const expiryDate = formData.get("expiryDate") as string;
        const barangay = (formData.get("barangay") as string) || (await getSessionBarangay());

        const announcementDelegate = (prisma as any).announcement;
        if (!announcementDelegate) {
            return { success: false, error: "Database model 'announcement' not found." };
        }

        const updated = await announcementDelegate.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                category: formData.get("category") as string,
                priority: formData.get("priority") as string,
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
        console.error("Error updating announcement:", error);
        return { success: false, error: "Failed to update announcement." };
    }
}

export async function deleteAnnouncement(id: string) {
    try {
        const announcementDelegate = (prisma as any).announcement;
        if (!announcementDelegate) {
            return { success: false, error: "Database model 'announcement' not found." };
        }

        await announcementDelegate.delete({ where: { id } });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting announcement:", error);
        return { success: false, error: "Failed to delete announcement." };
    }
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
    try {
        const announcementDelegate = (prisma as any).announcement;
        if (!announcementDelegate) {
            return { success: false, error: "Database model 'announcement' not found." };
        }

        await announcementDelegate.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating announcement status:", error);
        return { success: false, error: "Failed to update status." };
    }
}

export async function toggleAnnouncementPin(id: string, isPinned: boolean) {
    try {
        const announcementDelegate = (prisma as any).announcement;
        if (!announcementDelegate) {
            return { success: false, error: "Database model 'announcement' not found." };
        }

        await announcementDelegate.update({ where: { id }, data: { isPinned } });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating announcement pin status:", error);
        return { success: false, error: "Failed to update pin status." };
    }
}
