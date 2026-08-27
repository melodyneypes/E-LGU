"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function assertAdminSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
        throw new Error("Unauthorized access. Administrator role required to view Audit Logs.");
    }
    return { session, user };
}

/**
 * Fetch filtered and paginated audit logs with search, action, role, and department filters.
 */
export async function getAuditLogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    userRole?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        await assertAdminSession();

        const page = params?.page || 1;
        const limit = params?.limit || 15;
        const search = params?.search?.trim() || "";
        const department = params?.department || "ALL";
        const userRole = params?.userRole || "ALL";
        const action = params?.action || "ALL";
        const entityType = params?.entityType || "ALL";
        const startDate = params?.startDate?.trim() || "";
        const endDate = params?.endDate?.trim() || "";

        const skip = (page - 1) * limit;

        const where: any = {};

        // Department Filter
        if (department !== "ALL") {
            where.department = department;
        }

        // Role Filter
        if (userRole !== "ALL") {
            where.userRole = userRole;
        }

        // Action Filter
        if (action !== "ALL") {
            where.action = action;
        }

        // Entity Type Filter
        if (entityType !== "ALL") {
            where.entityType = entityType;
        }

        // Search Query (Operator Name, Description, Entity Name, Entity ID, User Email)
        if (search) {
            where.OR = [
                { userName: { contains: search, mode: "insensitive" } },
                { userEmail: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { entityName: { contains: search, mode: "insensitive" } },
                { entityId: { contains: search, mode: "insensitive" } },
            ];
        }

        // Date Range Filter
        if (startDate || endDate) {
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            }
            where.createdAt = dateFilter;
        }

        const [logs, totalCount] = await Promise.all([
            (prisma as any).auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            department: true
                        }
                    }
                }
            }),
            (prisma as any).auditLog.count({ where })
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1
            }
        };
    } catch (error: any) {
        console.error("[getAuditLogs] Error:", error);
        return { success: false, error: error.message || "Failed to fetch audit logs." };
    }
}

/**
 * Fetch KPI statistics for the audit log dashboard.
 */
export async function getAuditStats() {
    try {
        await assertAdminSession();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, criticalActionsCount, uniqueOperatorsRaw, departmentsRaw] = await Promise.all([
            (prisma as any).auditLog.count(),
            (prisma as any).auditLog.count({
                where: { createdAt: { gte: todayStart } }
            }),
            (prisma as any).auditLog.count({
                where: {
                    action: { in: ["APPROVE", "REJECT", "DELETE", "RELEASE", "STATUS_CHANGE"] }
                }
            }),
            (prisma as any).auditLog.findMany({
                select: { userName: true, userId: true },
                distinct: ["userName"]
            }),
            (prisma as any).auditLog.groupBy({
                by: ["department"],
                _count: { _all: true }
            })
        ]);

        // Find top active department
        let topDepartment = "GENERAL";
        let maxDeptCount = 0;
        departmentsRaw.forEach((d: any) => {
            if (d.department && d._count._all > maxDeptCount) {
                maxDeptCount = d._count._all;
                topDepartment = d.department;
            }
        });

        return {
            success: true,
            stats: {
                totalLogs,
                todayLogs,
                criticalActionsCount,
                activeOperatorsCount: uniqueOperatorsRaw.length,
                topDepartment
            }
        };
    } catch (error: any) {
        console.error("[getAuditStats] Error:", error);
        return {
            success: false,
            stats: {
                totalLogs: 0,
                todayLogs: 0,
                criticalActionsCount: 0,
                activeOperatorsCount: 0,
                topDepartment: "N/A"
            }
        };
    }
}

/**
 * Export filtered audit logs into CSV format.
 */
export async function exportAuditLogsCSV(params?: {
    search?: string;
    department?: string;
    userRole?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        await assertAdminSession();

        const search = params?.search?.trim() || "";
        const department = params?.department || "ALL";
        const userRole = params?.userRole || "ALL";
        const action = params?.action || "ALL";
        const startDate = params?.startDate?.trim() || "";
        const endDate = params?.endDate?.trim() || "";

        const where: any = {};
        if (department !== "ALL") where.department = department;
        if (userRole !== "ALL") where.userRole = userRole;
        if (action !== "ALL") where.action = action;
        if (search) {
            where.OR = [
                { userName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { entityName: { contains: search, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            const dateFilter: any = {};
            if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
            if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            where.createdAt = dateFilter;
        }

        const logs = await (prisma as any).auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 2000 // Cap to prevent memory spikes
        });

        const headers = ["Timestamp", "Staff Name", "Email", "Role", "Department", "Action", "Entity Type", "Entity Reference", "Description", "IP Address"];
        const rows = logs.map((l: any) => [
            `"${new Date(l.createdAt).toLocaleString("en-US")}"`,
            `"${(l.userName || "").replace(/"/g, '""')}"`,
            `"${(l.userEmail || "").replace(/"/g, '""')}"`,
            `"${l.userRole}"`,
            `"${l.department || "GENERAL"}"`,
            `"${l.action}"`,
            `"${l.entityType}"`,
            `"${(l.entityName || l.entityId || "").replace(/"/g, '""')}"`,
            `"${(l.description || "").replace(/"/g, '""')}"`,
            `"${l.ipAddress || "N/A"}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

        return {
            success: true,
            csv: csvContent,
            fileName: `Mapandan_Audit_Trail_${new Date().toISOString().split("T")[0]}.csv`
        };
    } catch (error: any) {
        console.error("[exportAuditLogsCSV] Error:", error);
        return { success: false, error: error.message || "Failed to generate CSV export." };
    }
}
