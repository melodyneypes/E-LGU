"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import lguConfig from "@/config/lgu.config.json";

async function getAuthenticatedUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || (user.role !== "ADMIN" && user.role !== "ADMIN_AIDE" && user.role !== "CONTENT_ADMIN")) {
        throw new Error("Unauthorized access. Admin privileges required.");
    }
    return user;
}

export async function getBploAnnouncements(params?: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    pageSize?: number;
}) {
    try {
        await getAuthenticatedUser();
        const page = Math.max(1, params?.page || 1);
        const pageSize = Math.max(1, Math.min(50, params?.pageSize || 10));
        const search = params?.search?.trim() || "";
        const status = params?.status || "All";
        const priority = params?.priority || "All";

        const where: any = {
            category: "Business"
        };

        if (status !== "All") {
            where.approvalStatus = status;
        }

        if (priority !== "All") {
            where.priority = priority;
        }

        if (search) {
            where.AND = [
                {
                    OR: [
                        { title: { contains: search, mode: "insensitive" } },
                        { content: { contains: search, mode: "insensitive" } },
                    ]
                }
            ];
        }

        const [announcements, totalCount] = await Promise.all([
            prisma.announcement.findMany({
                where,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.announcement.count({ where }),
        ]);

        return {
            success: true,
            data: announcements,
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
        };
    } catch (error: any) {
        console.error("Error fetching BPLO announcements:", error);
        return { success: false, error: error.message || "Failed to fetch announcements" };
    }
}

export async function createBploAnnouncement(formData: FormData) {
    try {
        const user = await getAuthenticatedUser();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const priority = (formData.get("priority") as string) || "Normal";
        const isPinned = formData.get("isPinned") === "true";
        const imageUrl = (formData.get("imageUrl") as string) || null;
        const expiryDateStr = formData.get("expiryDate") as string;
        const eventDateStr = formData.get("eventDate") as string;
        const eventSchedule = (formData.get("eventSchedule") as string) || null;

        if (!title || !content) {
            return { success: false, error: "Title and content are required." };
        }

        // BPLO announcements MUST always require LGU Admin review before going live
        const approvalStatus = "PENDING_APPROVAL";

        const createData: any = {
            title: title.trim(),
            content: content.trim(),
            priority,
            category: "Business",
            isPinned,
            isActive: true,
            imageUrl: imageUrl || null,
            authorEmail: user.email || null,
            authorId: user.id || null,
            expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
            eventDate: eventDateStr ? new Date(eventDateStr) : null,
            eventSchedule: eventSchedule || null,
        };

        let announcement: any;
        try {
            announcement = await (prisma as any).announcement.create({
                data: {
                    ...createData,
                    department: "BPLO",
                    approvalStatus,
                    submittedBy: `${user.name || "BPLO Staff"} (${user.email || lguConfig.seedAccounts.bploEmail})`,
                    approvedBy: null,
                }
            });
        } catch {
            try {
                const newId = `bplo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await (prisma as any).$executeRawUnsafe(
                    `INSERT INTO "Announcement" ("id", "title", "content", "category", "priority", "department", "approvalStatus", "isPinned", "isActive", "imageUrl", "authorEmail", "authorId", "submittedBy", "approvedBy", "expiryDate", "eventDate", "eventSchedule", "createdAt", "updatedAt") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
                    newId,
                    createData.title,
                    createData.content,
                    createData.category,
                    createData.priority,
                    "BPLO",
                    approvalStatus,
                    createData.isPinned,
                    createData.isActive,
                    createData.imageUrl,
                    createData.authorEmail,
                    createData.authorId,
                    `${user.name || "BPLO Staff"} (${user.email || lguConfig.seedAccounts.bploEmail})`,
                    null,
                    createData.expiryDate,
                    createData.eventDate,
                    createData.eventSchedule
                );
                announcement = { id: newId, ...createData, department: "BPLO", approvalStatus };
            } catch {
                announcement = await (prisma as any).announcement.create({
                    data: createData
                });
            }
        }

        revalidatePath("/admin/bplo/announcements");
        revalidatePath("/admin/announcements");
        revalidatePath("/user/services/business-permit");
        revalidatePath("/user/services/business-permit-appointment");
        revalidatePath("/");

        return {
            success: true,
            data: announcement,
            message: "Announcement submitted! Pending LGU Admin approval."
        };
    } catch (error: any) {
        console.error("Error creating BPLO announcement:", error);
        return { success: false, error: error.message || "Failed to create announcement" };
    }
}

export async function updateBploAnnouncement(id: string, formData: FormData) {
    try {
        await getAuthenticatedUser();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const priority = (formData.get("priority") as string) || "Normal";
        const isPinned = formData.get("isPinned") === "true";
        const imageUrl = (formData.get("imageUrl") as string) || null;
        const expiryDateStr = formData.get("expiryDate") as string;
        const eventDateStr = formData.get("eventDate") as string;
        const eventSchedule = (formData.get("eventSchedule") as string) || null;

        if (!title || !content) {
            return { success: false, error: "Title and content are required." };
        }

        const existing = await (prisma as any).announcement.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Announcement not found." };
        }

        const approvalStatus = "PENDING_APPROVAL";

        const updateData: any = {
            title: title.trim(),
            content: content.trim(),
            priority,
            isPinned,
            imageUrl,
            expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
            eventDate: eventDateStr ? new Date(eventDateStr) : null,
            eventSchedule,
        };

        let updated: any;
        try {
            updated = await (prisma as any).announcement.update({
                where: { id },
                data: {
                    ...updateData,
                    approvalStatus,
                }
            });
        } catch {
            try {
                await (prisma as any).$executeRawUnsafe(
                    `UPDATE "Announcement" SET "title" = $1, "content" = $2, "priority" = $3, "isPinned" = $4, "imageUrl" = $5, "approvalStatus" = $6, "expiryDate" = $7, "eventDate" = $8, "eventSchedule" = $9, "updatedAt" = NOW() WHERE "id" = $10`,
                    updateData.title,
                    updateData.content,
                    updateData.priority,
                    updateData.isPinned,
                    updateData.imageUrl,
                    approvalStatus,
                    updateData.expiryDate,
                    updateData.eventDate,
                    updateData.eventSchedule,
                    id
                );
                updated = { id, ...existing, ...updateData, approvalStatus };
            } catch {
                updated = await (prisma as any).announcement.update({
                    where: { id },
                    data: updateData
                });
            }
        }

        revalidatePath("/admin/bplo/announcements");
        revalidatePath("/admin/announcements");
        revalidatePath("/user/services/business-permit");
        revalidatePath("/user/services/business-permit-appointment");
        revalidatePath("/");

        return { success: true, data: updated, message: "Announcement updated successfully." };
    } catch (error: any) {
        console.error("Error updating BPLO announcement:", error);
        return { success: false, error: error.message || "Failed to update announcement" };
    }
}

export async function deleteBploAnnouncement(id: string) {
    try {
        await getAuthenticatedUser();
        await prisma.announcement.delete({ where: { id } });

        revalidatePath("/admin/bplo/announcements");
        revalidatePath("/admin/announcements");
        revalidatePath("/user/services/business-permit");
        revalidatePath("/user/services/business-permit-appointment");
        revalidatePath("/");

        return { success: true, message: "Announcement deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting BPLO announcement:", error);
        return { success: false, error: error.message || "Failed to delete announcement" };
    }
}

export async function toggleBploAnnouncementStatus(id: string, isActive: boolean) {
    try {
        await getAuthenticatedUser();
        const updated = await prisma.announcement.update({
            where: { id },
            data: { isActive }
        });

        revalidatePath("/admin/bplo/announcements");
        revalidatePath("/admin/announcements");
        revalidatePath("/user/services/business-permit");
        revalidatePath("/user/services/business-permit-appointment");
        revalidatePath("/");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling status:", error);
        return { success: false, error: error.message || "Failed to toggle status" };
    }
}
