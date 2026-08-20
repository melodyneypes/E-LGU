"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { revalidatePath } from "next/cache";

async function verifyLguAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const department = (session?.user as any)?.department;
    const isLguAdmin = role === "ADMIN" && (department?.toUpperCase() === "LGU" || !department);
    if (!session?.user || !isLguAdmin) {
        throw new Error("Unauthorized: Access denied. LGU Admin privileges required.");
    }
    return session.user;
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
            ];
        }

        const [documents, totalCount] = await Promise.all([
            (prisma as any).legislativeDocument.findMany({
                where,
                orderBy: { dateApproved: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            (prisma as any).legislativeDocument.count({ where }),
        ]);

        _docCache.set(cacheKey, {
            documents,
            totalCount,
            expiresAt: now + CACHE_TTL_MS
        });

        return { success: true, data: documents, totalCount };
    } catch (error: any) {
        console.error("Error fetching legislative documents:", error);
        return { success: false, error: error.message || "Failed to fetch documents" };
    }
}

export async function createLegislativeDocument(formData: FormData) {
    try {
        await verifyLguAdmin();

        const type = formData.get("type") as string;
        const referenceNumber = formData.get("referenceNumber") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const tagsString = formData.get("tags") as string;
        const dateApprovedVal = formData.get("dateApproved") as string;
        const status = formData.get("status") as string;
        const file = formData.get("file") as File;

        if (!type || !["ORDINANCE", "RESOLUTION"].includes(type)) {
            return { success: false, error: "Valid document type is required" };
        }
        if (!referenceNumber || !referenceNumber.trim()) {
            return { success: false, error: "Reference number is required" };
        }
        if (!title || !title.trim()) {
            return { success: false, error: "Title is required" };
        }
        if (!description || !description.trim()) {
            return { success: false, error: "Description is required" };
        }
        if (!dateApprovedVal) {
            return { success: false, error: "Date approved is required" };
        }
        if (!status || !status.trim()) {
            return { success: false, error: "Status is required" };
        }

        const tags = tagsString
            ? tagsString.split(",").map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
            : [];

        let pdfUrl: string | null = null;
        if (file && file.size > 0) {
            const fileName = `${Date.now()}_${file.name}`;
            const uploadPath = `legislative-documents/${fileName}`;
            const uploadedUrl = await uploadFile(file, uploadPath);
            if (!uploadedUrl) {
                return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
            }
            pdfUrl = uploadedUrl;
        }

        const document = await (prisma as any).legislativeDocument.create({
            data: {
                type,
                referenceNumber: referenceNumber.trim(),
                title: title.trim(),
                description: description.trim(),
                tags,
                dateApproved: new Date(dateApprovedVal),
                status: status.trim(),
                pdfUrl,
            },
        });

        clearCache();
        revalidatePath("/admin/ordinances");

        return { success: true, data: document };
    } catch (error: any) {
        console.error("Error creating legislative document:", error);
        return { success: false, error: error.message || "Failed to create document" };
    }
}

export async function updateLegislativeDocument(id: string, formData: FormData) {
    try {
        await verifyLguAdmin();

        const type = formData.get("type") as string;
        const referenceNumber = formData.get("referenceNumber") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const tagsString = formData.get("tags") as string;
        const dateApprovedVal = formData.get("dateApproved") as string;
        const status = formData.get("status") as string;
        const file = formData.get("file") as File;

        const existing = await (prisma as any).legislativeDocument.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Document not found" };
        }

        let pdfUrl = existing.pdfUrl;

        if (file && file.size > 0 && file.name !== "undefined") {
            const fileName = `${Date.now()}_${file.name}`;
            const uploadPath = `legislative-documents/${fileName}`;
            const uploadedUrl = await uploadFile(file, uploadPath);
            if (!uploadedUrl) {
                return { success: false, error: "Failed to upload file. Please ensure it is a valid PDF or Image." };
            }

            pdfUrl = uploadedUrl;

            // Delete old file if present
            if (existing.pdfUrl) {
                try {
                    await deleteFileByUrl(existing.pdfUrl);
                } catch (delErr) {
                    console.error("Failed to delete old file:", delErr);
                }
            }
        }

        const tags = tagsString
            ? tagsString.split(",").map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
            : existing.tags;

        const updated = await (prisma as any).legislativeDocument.update({
            where: { id },
            data: {
                type: type || existing.type,
                referenceNumber: referenceNumber ? referenceNumber.trim() : existing.referenceNumber,
                title: title ? title.trim() : existing.title,
                description: description ? description.trim() : existing.description,
                tags,
                dateApproved: dateApprovedVal ? new Date(dateApprovedVal) : existing.dateApproved,
                status: status ? status.trim() : existing.status,
                pdfUrl,
            },
        });

        clearCache();
        revalidatePath("/admin/ordinances");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating legislative document:", error);
        return { success: false, error: error.message || "Failed to update document" };
    }
}

export async function deleteLegislativeDocument(id: string) {
    try {
        await verifyLguAdmin();

        const existing = await (prisma as any).legislativeDocument.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Document not found" };
        }

        await (prisma as any).legislativeDocument.delete({
            where: { id },
        });

        if (existing.pdfUrl) {
            try {
                await deleteFileByUrl(existing.pdfUrl);
            } catch (delErr) {
                console.error("Failed to delete file from storage:", delErr);
            }
        }

        clearCache();
        revalidatePath("/admin/ordinances");

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting legislative document:", error);
        return { success: false, error: error.message || "Failed to delete document" };
    }
}

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
