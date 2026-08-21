"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { revalidatePath } from "next/cache";

async function verifyAdminOrMayor() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== "ADMIN" && role !== "MAYOR")) {
        throw new Error("Unauthorized: Executive privileges required.");
    }
    return session.user;
}

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
                include: {
                    reads: {
                        select: {
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
            (prisma as any).executiveDirective.count({ where }),
        ]);

        return { success: true, data: directives, totalCount };
    } catch (error: any) {
        console.error("Error fetching executive directives:", error);
        return { success: false, error: error.message || "Failed to fetch directives." };
    }
}

export async function createExecutiveDirective(formData: FormData) {
    try {
        const user = await verifyAdminOrMayor();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const category = (formData.get("category") as string) || "MEMORANDUM";
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
        
        // Save the authenticated user's name as senderName
        const senderName = (user as any).name || (user as any).email || "Office of the Municipal Mayor";

        if (!title || !title.trim()) {
            return { success: false, error: "Directive title is required." };
        }
        if (!content || !content.trim()) {
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
                attachmentUrl = uploadedUrl;
                attachmentName = file.name;
                attachmentSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
            } else {
                console.error("[Directive Creation] PDF uploadFile returned null for:", file.name);
            }
        }

        const directive = await (prisma as any).executiveDirective.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                category,
                priority,
                targetScope,
                targetBarangays,
                targetBarangay,
                senderName,
                senderId: (user as any).id,
                attachmentUrl,
                attachmentName,
                attachmentSize,
                isPublished: true,
            }
        });

        revalidatePath("/admin/directives");
        revalidatePath("/captain/dashboard");

        return { success: true, data: directive };
    } catch (error: any) {
        console.error("Error creating executive directive:", error);
        return { success: false, error: error.message || "Failed to issue directive." };
    }
}

export async function getExecutiveDirectiveById(id: string) {
    try {
        await verifyAdminOrMayor();

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

export async function deleteExecutiveDirective(id: string) {
    try {
        await verifyAdminOrMayor();

        const existing = await (prisma as any).executiveDirective.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Directive not found." };
        }

        if (existing.attachmentUrl) {
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

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting executive directive:", error);
        return { success: false, error: error.message || "Failed to delete directive." };
    }
}
