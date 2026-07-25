"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await getServerSession(authOptions);
}

export async function getRHUAdminTransactions(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    checkupType?: string;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const status = params?.status || "ALL";
        const checkupType = params?.checkupType || "ALL";

        const skip = (page - 1) * limit;

        const whereClause: any = {
            type: {
                category: {
                    in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"]
                }
            }
        };

        // Filter by Status
        if (status === "CANCELLED") {
            whereClause.isCancelled = true;
        } else if (status !== "ALL") {
            whereClause.isCancelled = false;
            whereClause.status = status;
        }

        // Search Filter (Control Number, User Name, Patient Name, Barangay)
        if (search) {
            whereClause.OR = [
                { controlNumber: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
                { residentSnapshot: { path: ["firstName"], string_contains: search } },
                { residentSnapshot: { path: ["lastName"], string_contains: search } },
                { residentSnapshot: { path: ["barangay"], string_contains: search } },
            ];
        }

        // Checkup Type Filter
        if (checkupType && checkupType !== "ALL") {
            whereClause.additionalData = {
                path: ["checkupType"],
                equals: checkupType
            };
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            residentProfile: true
                        }
                    },
                    type: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.transaction.count({ where: whereClause })
        ]);

        return {
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error: any) {
        console.error("getRHUAdminTransactions error:", error);
        return { success: false, error: error.message || "Failed to fetch RHU transactions." };
    }
}

export async function updateRHUAppointmentStatus(
    transactionId: string,
    status: string,
    remarks?: string
) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!existing) {
            return { success: false, error: "Transaction not found." };
        }

        const isCancelled = status === "CANCELLED" || status === "REJECTED";

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: (isCancelled ? "REJECTED" : status) as any,
                isCancelled,
                rejectionRemarks: remarks || null,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/rhu");
        revalidatePath(`/admin/rhu/${transactionId}`);
        revalidatePath("/user/appointment");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateRHUAppointmentStatus error:", error);
        return { success: false, error: error.message || "Failed to update appointment status." };
    }
}

export async function getRHUDashboardStats() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const baseWhere = {
            type: {
                category: {
                    in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"]
                }
            }
        };

        const [total, pending, confirmed, completed, cancelled] = await Promise.all([
            prisma.transaction.count({ where: baseWhere }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: { in: ["FOR_INSPECTION", "FOR_REQUESTING"] as any } }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: { in: ["EVALUATED", "FOR_PROCESSING", "PAID"] as any } }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: false, status: { in: ["RELEASED", "DELIVERED"] as any } }
            }),
            prisma.transaction.count({
                where: { ...baseWhere, isCancelled: true }
            })
        ]);

        return {
            success: true,
            stats: {
                total,
                pending,
                confirmed,
                completed,
                cancelled
            }
        };
    } catch (error: any) {
        console.error("getRHUDashboardStats error:", error);
        return { success: false, error: error.message || "Failed to fetch stats." };
    }
}
