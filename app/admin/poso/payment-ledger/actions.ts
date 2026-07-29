"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPosoPaymentsLedger(params: {
    search?: string;
    method?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    exportAll?: boolean;
} = {}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || (user.role !== "ADMIN" && user.role !== "POSO_OFFICER" && user.role !== "TREASURY_STAFF" && user.department !== "POSO")) {
            return { success: false, error: "Unauthorized — POSO Admin access required." };
        }

        const searchQuery = params.search || "";
        const methodFilter = params.method || "ALL";
        const fromStr = params.from;
        const toStr = params.to;
        const page = params.page || 1;
        const limit = params.limit || 10;
        const exportAll = params.exportAll || false;

        // Base where clause: Filter by POSO category or POSO_CITATION / POSO_TRAFFIC_FINE codes
        const whereClause: any = {
            transaction: {
                type: {
                    OR: [
                        { category: "POSO" },
                        { code: "POSO_CITATION" },
                        { code: "POSO_TRAFFIC_FINE" },
                        { code: "POSO" }
                    ]
                }
            }
        };

        // Date Range Filter
        if (fromStr || toStr) {
            whereClause.createdAt = {};
            if (fromStr) {
                const fromDate = new Date(fromStr);
                fromDate.setHours(0, 0, 0, 0);
                whereClause.createdAt.gte = fromDate;
            }
            if (toStr) {
                const toDate = new Date(toStr);
                toDate.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = toDate;
            }
        }

        // Method Filter
        if (methodFilter && methodFilter !== "ALL") {
            whereClause.method = methodFilter;
        }

        // Search Filter
        if (searchQuery) {
            const searchOrs = [
                { reference: { contains: searchQuery, mode: "insensitive" } },
                { transactionId: { contains: searchQuery, mode: "insensitive" } },
                { id: { contains: searchQuery, mode: "insensitive" } },
                {
                    transaction: {
                        OR: [
                            { queueNumber: { contains: searchQuery, mode: "insensitive" } },
                            {
                                user: {
                                    name: { contains: searchQuery, mode: "insensitive" }
                                }
                            }
                        ]
                    }
                }
            ];

            // Merge with existing transaction filter
            const existingTxFilter = whereClause.transaction;
            delete whereClause.transaction;
            whereClause.AND = [
                { transaction: existingTxFilter },
                { OR: searchOrs }
            ];
        }

        // Stats aggregation
        const [statsResult, totalCount] = await Promise.all([
            prisma.payment.aggregate({
                where: {
                    ...whereClause,
                    status: "PAID"
                },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            }),
            prisma.payment.count({
                where: whereClause
            })
        ]);

        const totalPaid = statsResult._sum.amount || 0;
        const paidCount = statsResult._count.id || 0;
        const totalPages = Math.ceil(totalCount / limit);

        // Paginated query
        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                transaction: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        paymentType: true,
                        paymentReference: true,
                        queueNumber: true,
                        residentSnapshot: true,
                        additionalData: true,
                        type: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                category: true
                            }
                        },
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            ...(exportAll ? {} : {
                skip: (page - 1) * limit,
                take: limit
            })
        });

        return {
            success: true,
            data: JSON.parse(JSON.stringify(payments)),
            totalCount,
            totalPages,
            currentPage: page,
            stats: { totalPaid: Number(totalPaid), paidCount }
        };
    } catch (error: any) {
        console.error("Failed to fetch POSO payments ledger:", error);
        return { success: false, error: error.message || "Failed to fetch POSO payments ledger." };
    }
}
