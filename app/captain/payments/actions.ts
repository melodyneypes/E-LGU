"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCaptainPaymentsLedger(params: {
    from?: string;
    to?: string;
    category?: string;
    method?: string;
    search?: string;
    page?: number;
    limit?: number;
    barangay?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const userRole = user?.role;

        if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const managedBarangay = user?.managedBarangay || params.barangay || "Apaya";
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = params.to ? new Date(params.to) : new Date();
        toDate.setHours(23, 59, 59, 999);

        // Strict Level 0 and Captain Barangay Matching
        const whereClause: any = {
            createdAt: {
                gte: fromDate,
                lte: toDate
            },
            transaction: {
                type: {
                    level: 0
                },
                OR: [
                    {
                        user: {
                            residentProfile: {
                                barangay: { equals: managedBarangay, mode: "insensitive" }
                            }
                        }
                    },
                    {
                        residentSnapshot: {
                            path: ["barangay"],
                            string_contains: managedBarangay
                        }
                    },
                    {
                        residentSnapshot: {
                            string_contains: managedBarangay
                        }
                    }
                ]
            }
        };

        if (params.method && params.method !== "ALL") {
            whereClause.method = params.method;
        }

        if (params.category && params.category !== "ALL") {
            whereClause.transaction.type = {
                level: 0,
                category: params.category
            };
        }

        const searchPattern = params.search ? params.search.trim().toLowerCase() : "";

        const selectFields = {
            id: true,
            amount: true,
            method: true,
            status: true,
            reference: true,
            orNumber: true,
            createdAt: true,
            transaction: {
                select: {
                    id: true,
                    status: true,
                    residentSnapshot: true,
                    additionalData: true,
                    type: {
                        select: {
                            name: true,
                            category: true,
                            level: true
                        }
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                            residentProfile: {
                                select: {
                                    barangay: true
                                }
                            }
                        }
                    }
                }
            }
        };

        let paymentsRaw: any[] = [];
        let totalCount = 0;
        let stats = {
            totalCount: 0,
            totalRevenue: 0,
            paidCount: 0,
            pendingCount: 0,
            avgPayment: 0
        };

        if (searchPattern) {
            const allCandidatePayments = await (prisma as any).payment.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                select: selectFields
            });

            const filtered = allCandidatePayments.filter((p: any) => {
                const idMatch = p.id.toLowerCase().includes(searchPattern);
                const orMatch = p.orNumber?.toLowerCase().includes(searchPattern) ?? false;
                const refMatch = p.reference?.toLowerCase().includes(searchPattern) ?? false;
                const txIdMatch = p.transaction?.id?.toLowerCase().includes(searchPattern) ?? false;
                const typeNameMatch = p.transaction?.type?.name?.toLowerCase().includes(searchPattern) ?? false;
                const userNameMatch = p.transaction?.user?.name?.toLowerCase().includes(searchPattern) ?? false;

                let snapshotMatch = false;
                if (p.transaction?.residentSnapshot) {
                    const snapStr = typeof p.transaction.residentSnapshot === "string"
                        ? p.transaction.residentSnapshot
                        : JSON.stringify(p.transaction.residentSnapshot);
                    snapshotMatch = snapStr.toLowerCase().includes(searchPattern);
                }

                return idMatch || orMatch || refMatch || txIdMatch || typeNameMatch || userNameMatch || snapshotMatch;
            });

            totalCount = filtered.length;
            paymentsRaw = filtered.slice(skip, skip + limit);

            let sumRevenue = 0;
            let paidCount = 0;
            let pendingCount = 0;

            filtered.forEach((p: any) => {
                if (p.status === "PAID") {
                    sumRevenue += p.amount || 0;
                    paidCount++;
                } else if (p.status === "PENDING") {
                    pendingCount++;
                }
            });

            stats = {
                totalCount: filtered.length,
                totalRevenue: sumRevenue,
                paidCount,
                pendingCount,
                avgPayment: paidCount > 0 ? sumRevenue / paidCount : 0
            };
        } else {
            const [paymentsData, countData, aggData, statusGroups] = await Promise.all([
                (prisma as any).payment.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                    select: selectFields
                }),
                (prisma as any).payment.count({ where: whereClause }),
                (prisma as any).payment.aggregate({
                    where: { ...whereClause, status: "PAID" },
                    _sum: { amount: true },
                    _avg: { amount: true },
                    _count: { id: true }
                }),
                (prisma as any).payment.groupBy({
                    by: ["status"],
                    where: whereClause,
                    _count: { id: true }
                })
            ]);

            paymentsRaw = paymentsData;
            totalCount = countData;

            let pendingCount = 0;
            let paidCount = 0;
            statusGroups.forEach((g: any) => {
                if (g.status === "PENDING") pendingCount = g._count.id;
                if (g.status === "PAID") paidCount = g._count.id;
            });

            const totalRevenue = aggData._sum.amount || 0;
            const avgPayment = aggData._avg.amount || 0;

            stats = {
                totalCount,
                totalRevenue,
                paidCount,
                pendingCount,
                avgPayment
            };
        }

        const totalPages = Math.ceil(totalCount / limit) || 1;

        const payments = paymentsRaw.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            status: p.status,
            reference: p.reference,
            orNumber: p.orNumber,
            createdAt: p.createdAt.toISOString(),
            transaction: p.transaction
        }));

        return {
            success: true,
            payments,
            totalCount,
            totalPages,
            currentPage: page,
            stats
        };
    } catch (error: any) {
        console.error("Error in getCaptainPaymentsLedger:", error);
        return { success: false, error: error.message || "Failed to retrieve payment records." };
    }
}
