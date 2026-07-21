"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPaymentsLedger(params: {
    search?: string;
    method?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    exportAll?: boolean;
} = {}) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;

        if (role !== "TREASURY_STAFF" && role !== "ADMIN") {
            return { success: false, error: "Unauthorized" };
        }

        const searchQuery = params.search || "";
        const methodFilter = params.method || "ALL";
        const categoryFilter = params.category || "ALL";
        const fromStr = params.from;
        const toStr = params.to;
        const page = params.page || 1;
        const limit = params.limit || 10;
        const exportAll = params.exportAll || false;

        const paidTransactionsWithoutPayment = await prisma.transaction.findMany({
            where: {
                status: {
                    in: ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE", "RELEASED", "DELIVERED"]
                },
                payment: null
            },
            select: {
                id: true,
                totalAmount: true,
                paymentType: true,
                paymentReference: true,
                orUrl: true,
                additionalData: true,
                updatedAt: true
            }
        });

        if (paidTransactionsWithoutPayment.length > 0) {
            const transactionsWithPaymentEvidence = paidTransactionsWithoutPayment.filter((transaction) => {
                const additional = (transaction.additionalData as any) || {};
                return Boolean(
                    transaction.paymentReference ||
                    transaction.orUrl ||
                    additional.gcashReferenceNo ||
                    additional.referenceNo ||
                    additional.paymentReference ||
                    additional.paymentReferenceUrl ||
                    additional.paymentProofUrl ||
                    additional.treasuryReceiptUrl ||
                    additional.orSeriesNumber ||
                    additional.orDocumentUrl
                );
            });

            await prisma.payment.createMany({
                data: transactionsWithPaymentEvidence.map((transaction) => {
                    const additional = (transaction.additionalData as any) || {};
                    const reference =
                        additional.gcashReferenceNo ||
                        additional.referenceNo ||
                        additional.paymentReference ||
                        transaction.paymentReference ||
                        `manual_${transaction.id}`;

                    return {
                        transactionId: transaction.id,
                        amount: Number(transaction.totalAmount || 0),
                        method: transaction.paymentType || "CASH",
                        status: "PAID",
                        reference: String(reference),
                        orNumber: additional.orSeriesNumber ? String(additional.orSeriesNumber) : null,
                        meta: {
                            source: "paid_transaction_reconciliation",
                            reconciledAt: new Date().toISOString(),
                            transactionPaidAt: transaction.updatedAt.toISOString()
                        }
                    };
                }),
                skipDuplicates: true
            });
        }

        const whereClause: any = {};

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

        // Category Filter
        if (categoryFilter && categoryFilter !== "ALL") {
            whereClause.transaction = {
                type: {
                    category: categoryFilter
                }
            };
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
                            { businessName: { contains: searchQuery, mode: "insensitive" } },
                            {
                                user: {
                                    name: { contains: searchQuery, mode: "insensitive" }
                                }
                            }
                        ]
                    }
                }
            ];

            if (whereClause.transaction) {
                whereClause.AND = [
                    { transaction: whereClause.transaction },
                    { OR: searchOrs }
                ];
                delete whereClause.transaction;
            } else {
                whereClause.OR = searchOrs;
            }
        }

        // Calculate stats on filtered subset using database-level aggregation
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

        // Query paginated items
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
                        residentSnapshot: true,
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
            data: payments,
            totalCount,
            totalPages,
            currentPage: page,
            stats: { totalPaid, paidCount }
        };
    } catch (error: any) {
        console.error("Failed to fetch payments ledger:", error);
        return { success: false, error: error.message || "Failed to fetch payments" };
    }
}
