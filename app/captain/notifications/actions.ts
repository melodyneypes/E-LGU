"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCaptainNotifications() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const role = user?.role;

        if (!session?.user || (role !== "BARANGAY_CAPTAIN" && role !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = user.id;
        const managedBarangay = user.managedBarangay || "{{BARANGAY_NAME}}";

        // Query directives that are either broadcast to ALL_CAPTAINS or specifically targeted to this Captain's barangay
        const allDirectives = await (prisma as any).executiveDirective.findMany({
            where: {
                isPublished: true,
            },
            include: {
                reads: {
                    where: { userId }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 30
        });

        // Robust multi-tenant barangay matching (Case-Insensitive for string, array, or substring list)
        const managedClean = (managedBarangay || "").trim().toLowerCase();
        const directives = allDirectives.filter((d: any) => {
            if (d.targetScope === "ALL_CAPTAINS") return true;

            // Check targetBarangay string (e.g. "{{BARANGAY_NAME}}" or "{{BARANGAY_NAME}}, {{BARANGAY_NAME}}, {{BARANGAY_NAME}}")
            if (d.targetBarangay) {
                const parts = d.targetBarangay.split(",").map((p: string) => p.trim().toLowerCase());
                if (parts.includes(managedClean)) return true;
                if (d.targetBarangay.toLowerCase().includes(managedClean)) return true;
            }

            // Check targetBarangays string array
            if (Array.isArray(d.targetBarangays) && d.targetBarangays.length > 0) {
                const hasMatch = d.targetBarangays.some(
                    (b: string) => b.trim().toLowerCase() === managedClean
                );
                if (hasMatch) return true;
            }

            return false;
        });

        const notifications = directives.map((d: any) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            category: d.category,
            priority: d.priority,
            attachmentUrl: d.attachmentUrl,
            attachmentName: d.attachmentName,
            attachmentSize: d.attachmentSize,
            senderName: d.senderName || "Office of the Municipal Mayor",
            createdAt: d.createdAt.toISOString(),
            isRead: d.reads && d.reads.length > 0,
            readAt: d.reads && d.reads.length > 0 ? d.reads[0].readAt.toISOString() : null
        }));

        const unreadCount = notifications.filter((n: any) => !n.isRead).length;

        return {
            success: true,
            notifications,
            unreadCount
        };
    } catch (error: any) {
        console.error("Error fetching captain notifications:", error);
        return { success: false, error: error.message || "Failed to fetch notifications." };
    }
}

export async function getCaptainDirectiveById(directiveId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const role = user?.role;

        if (!session?.user || (role !== "BARANGAY_CAPTAIN" && role !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = user.id;
        const managedBarangay = user.managedBarangay || "{{BARANGAY_NAME}}";

        const directive = await (prisma as any).executiveDirective.findUnique({
            where: { id: directiveId },
            include: {
                reads: {
                    where: { userId }
                }
            }
        });

        if (!directive || !directive.isPublished) {
            return { success: false, error: "Directive not found or not published." };
        }

        // Verify that this captain is in the target scope
        const isTargeted =
            directive.targetScope === "ALL_CAPTAINS" ||
            (directive.targetBarangay && directive.targetBarangay.toLowerCase() === managedBarangay.toLowerCase()) ||
            (directive.targetBarangays && directive.targetBarangays.includes(managedBarangay));

        if (!isTargeted) {
            return { success: false, error: "You do not have permission to view this directive." };
        }

        // Auto mark as read
        if (!directive.reads || directive.reads.length === 0) {
            await (prisma as any).directiveRecipientRead.upsert({
                where: {
                    directiveId_userId: {
                        directiveId,
                        userId
                    }
                },
                update: { readAt: new Date() },
                create: { directiveId, userId, readAt: new Date() }
            });
        }

        return {
            success: true,
            directive: {
                id: directive.id,
                title: directive.title,
                content: directive.content,
                category: directive.category,
                priority: directive.priority,
                targetScope: directive.targetScope,
                targetBarangay: directive.targetBarangay,
                targetBarangays: directive.targetBarangays,
                attachmentUrl: directive.attachmentUrl,
                attachmentName: directive.attachmentName,
                attachmentSize: directive.attachmentSize,
                senderName: directive.senderName || "Office of the Municipal Mayor",
                createdAt: directive.createdAt.toISOString(),
                isRead: true,
                readAt: directive.reads && directive.reads.length > 0 ? directive.reads[0].readAt.toISOString() : new Date().toISOString(),
            }
        };
    } catch (error: any) {
        console.error("Error fetching directive by id:", error);
        return { success: false, error: error.message || "Failed to fetch directive." };
    }
}

export async function markDirectiveAsRead(directiveId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = user.id;

        await (prisma as any).directiveRecipientRead.upsert({
            where: {
                directiveId_userId: {
                    directiveId,
                    userId
                }
            },
            update: {
                readAt: new Date()
            },
            create: {
                directiveId,
                userId,
                readAt: new Date()
            }
        });

        revalidatePath("/captain/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error marking directive as read:", error);
        return { success: false, error: error.message || "Failed to mark as read." };
    }
}

export async function markAllDirectivesAsRead() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = user.id;
        const managedBarangay = user.managedBarangay || "{{BARANGAY_NAME}}";

        const directives = await (prisma as any).executiveDirective.findMany({
            where: {
                isPublished: true,
                OR: [
                    { targetScope: "ALL_CAPTAINS" },
                    {
                        targetScope: "SPECIFIC_BARANGAY",
                        targetBarangay: { equals: managedBarangay, mode: "insensitive" }
                    },
                    {
                        targetScope: "SPECIFIC_BARANGAY",
                        targetBarangays: { has: managedBarangay }
                    }
                ]
            },
            select: { id: true }
        });

        for (const d of directives) {
            await (prisma as any).directiveRecipientRead.upsert({
                where: {
                    directiveId_userId: {
                        directiveId: d.id,
                        userId
                    }
                },
                update: {
                    readAt: new Date()
                },
                create: {
                    directiveId: d.id,
                    userId,
                    readAt: new Date()
                }
            });
        }

        revalidatePath("/captain/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error marking all directives as read:", error);
        return { success: false, error: error.message || "Failed to mark all as read." };
    }
}
