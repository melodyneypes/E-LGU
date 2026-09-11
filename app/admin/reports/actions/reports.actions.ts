"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { deleteFileByUrl } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
 * Enforces role clearances: ADMIN (LGU), MAYOR, MDRRMO, BARANGAY_ADMIN, or custom accessiblePages
 */
export async function verifyReportAccess(): Promise<{
    authorized: boolean;
    error: string | null;
    user: SessionUser | null;
    isBarangayAdmin: boolean;
    managedBarangay: string | null;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return {
            authorized: false,
            error: "Unauthorized access. Please sign in.",
            user: null,
            isBarangayAdmin: false,
            managedBarangay: null
        };
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isMayor = role === "MAYOR";
    const isMdrrmo = role === "MDRRMO";
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/reports");

    if (!isLguAdmin && !isMayor && !isMdrrmo && !isBarangayAdmin && !hasPageAccess) {
        return {
            authorized: false,
            error: "Forbidden: You do not have permissions to manage community incident reports.",
            user,
            isBarangayAdmin: false,
            managedBarangay: null
        };
    }

    return {
        authorized: true,
        error: null,
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * 2. GET REPORTS LIST (LEAN QUERIES WITH PAGINATION, SEARCH & FILTER)
 */
export async function getAdminReports(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    barangay?: string;
}) {
    try {
        const auth = await verifyReportAccess();
        if (!auth.authorized) {
            return {
                success: false,
                error: auth.error || "Unauthorized access.",
                reports: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: 1,
                stats: { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 }
            };
        }

        const { isBarangayAdmin, managedBarangay } = auth;

        const page = Math.max(1, params?.page ?? 1);
        const limit = Math.max(1, params?.limit ?? 10);
        const search = params?.search?.trim() ?? "";
        const status = params?.status ?? "All";
        const barangay = params?.barangay ?? "All";

        const whereClause: any = {};

        // Scope to barangay if user is Barangay Admin
        if (isBarangayAdmin) {
            if (!managedBarangay) {
                return {
                    success: true,
                    reports: [],
                    totalCount: 0,
                    totalPages: 0,
                    currentPage: 1,
                    stats: { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 }
                };
            }
            whereClause.barangay = { name: managedBarangay };
        } else if (barangay !== "All") {
            whereClause.barangay = { name: barangay };
        }

        // Status Filter
        if (status !== "All") {
            whereClause.status = status;
        }

        // Search Filter
        if (search) {
            whereClause.OR = [
                { category: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } }
            ];
        }

        const [reports, totalCount] = await Promise.all([
            (prisma as any).report.findMany({
                where: whereClause,
                select: {
                    id: true,
                    category: true,
                    description: true,
                    status: true,
                    images: true,
                    latitude: true,
                    longitude: true,
                    address: true,
                    adminComment: true,
                    createdAt: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    barangay: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            (prisma as any).report.count({ where: whereClause })
        ]);

        // Stats Scoping
        const statsWhereClause: any = {};
        if (isBarangayAdmin && managedBarangay) {
            statsWhereClause.barangay = { name: managedBarangay };
        }

        const [totalStats, pendingStats, inProgressStats, completedStats, rejectedStats] = await Promise.all([
            (prisma as any).report.count({ where: statsWhereClause }),
            (prisma as any).report.count({ where: { ...statsWhereClause, status: "PENDING" } }),
            (prisma as any).report.count({ where: { ...statsWhereClause, status: "IN_PROGRESS" } }),
            (prisma as any).report.count({ where: { ...statsWhereClause, status: "COMPLETED" } }),
            (prisma as any).report.count({ where: { ...statsWhereClause, status: "REJECTED" } }),
        ]);

        return {
            success: true,
            reports,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            stats: {
                total: totalStats,
                pending: pendingStats,
                inProgress: inProgressStats,
                completed: completedStats,
                rejected: rejectedStats
            }
        };
    } catch (error: any) {
        console.error("[getAdminReports] Error:", error);
        return {
            success: false,
            error: error?.message || "Failed to fetch community reports."
        };
    }
}

/**
 * 3. GET REPORT BY ID (FAST MODAL SYNC)
 */
export async function getReportById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Report ID is required." };
        }

        const auth = await verifyReportAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error || "Unauthorized access." };
        }

        const { isBarangayAdmin, managedBarangay } = auth;

        const report = await (prisma as any).report.findUnique({
            where: { id },
            select: {
                id: true,
                category: true,
                description: true,
                status: true,
                images: true,
                latitude: true,
                longitude: true,
                address: true,
                adminComment: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                barangay: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!report) {
            return { success: false, error: "Report record not found." };
        }

        if (isBarangayAdmin && report.barangay?.name && report.barangay.name !== managedBarangay) {
            return { success: false, error: "Unauthorized access to report from another barangay." };
        }

        return { success: true, data: report, report };
    } catch (error: any) {
        console.error("[getReportById] Error:", error);
        return { success: false, error: error?.message || "Failed to retrieve report details." };
    }
}

/**
 * 4. UPDATE REPORT STATUS & ADMIN COMMENT + AUDIT LOGGING
 */
export async function updateReportStatus(id: string, status: string, adminComment?: string) {
    try {
        if (!id) {
            return { success: false, error: "Report ID is required." };
        }

        const auth = await verifyReportAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error || "Unauthorized access." };
        }

        const { isBarangayAdmin, managedBarangay } = auth;

        const existing = await (prisma as any).report.findUnique({
            where: { id },
            include: { barangay: true, user: true }
        });

        if (!existing) {
            return { success: false, error: "Report not found." };
        }

        if (isBarangayAdmin && existing.barangay?.name && existing.barangay.name !== managedBarangay) {
            return { success: false, error: "Unauthorized to update report from another barangay." };
        }

        const updated = await (prisma as any).report.update({
            where: { id },
            data: {
                status,
                adminComment: adminComment !== undefined ? adminComment : existing.adminComment,
            },
            include: {
                barangay: { select: { id: true, name: true } },
                user: { select: { name: true, email: true } }
            }
        });

        revalidatePath("/admin/reports");
        revalidatePath("/reports");

        // 5. Audit Logging with Status Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (existing.status !== status) changes["status"] = { old: existing.status, new: status };
            if (adminComment !== undefined && existing.adminComment !== adminComment) {
                changes["adminComment"] = { old: existing.adminComment, new: adminComment };
            }

            await logActivity({
                action: "UPDATE",
                entityType: "Report",
                entityId: id,
                entityName: `${updated.category || "Report"} (${updated.status})`,
                description: `Updated status of report #${id.slice(-6).toUpperCase()} to ${status}`,
                metadata: {
                    reportId: id,
                    category: updated.category,
                    previousStatus: existing.status,
                    newStatus: status,
                    adminComment: adminComment || null,
                    changes,
                    reporter: existing.user?.name || existing.user?.email || "Anonymous",
                    barangay: updated.barangay?.name || "Unassigned"
                }
            });
        } catch (auditErr) {
            console.warn("[updateReportStatus] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, report: updated };
    } catch (error: any) {
        console.error("[updateReportStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to update report status." };
    }
}

/**
 * 5. DELETE REPORT + COMPLETE EVIDENCE STORAGE CLEANUP + AUDIT SNAPSHOT
 */
export async function deleteReport(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Report ID is required." };
        }

        const auth = await verifyReportAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error || "Unauthorized access." };
        }

        const { isBarangayAdmin, managedBarangay } = auth;

        const existing = await (prisma as any).report.findUnique({
            where: { id },
            include: { barangay: true, user: true }
        });

        if (!existing) {
            return { success: false, error: "Report not found." };
        }

        if (isBarangayAdmin && existing.barangay?.name && existing.barangay.name !== managedBarangay) {
            return { success: false, error: "Unauthorized to delete report from another barangay." };
        }

        // Delete from database
        await (prisma as any).report.delete({
            where: { id }
        });

        // 4. STORAGE CLEANUP: Delete all attached evidence images from storage bucket
        if (existing.images && Array.isArray(existing.images) && existing.images.length > 0) {
            console.log(`[deleteReport] Cleaning up ${existing.images.length} evidence photo(s) for report #${id}...`);
            await Promise.all(
                existing.images.map(async (imgUrl: string) => {
                    try {
                        await deleteFileByUrl(imgUrl);
                    } catch (storageErr) {
                        console.warn(`[deleteReport] Failed to delete evidence photo "${imgUrl}":`, storageErr);
                    }
                })
            );
        }

        revalidatePath("/admin/reports");
        revalidatePath("/reports");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Report",
                entityId: id,
                entityName: `${existing.category || "Report"} #${id.slice(-6).toUpperCase()}`,
                description: `Deleted community incident report #${id.slice(-6).toUpperCase()} (${existing.category})`,
                metadata: {
                    deletedRecordSnapshot: existing,
                    cleanedImagesCount: existing.images?.length || 0
                }
            });
        } catch (auditErr) {
            console.warn("[deleteReport] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteReport] Error:", error);
        return { success: false, error: error?.message || "Failed to delete report." };
    }
}
