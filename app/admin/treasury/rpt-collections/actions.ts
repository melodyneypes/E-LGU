"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getRptCollectionsLedger(params: {
    search?: string;
    method?: string;
    rptType?: string;
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
        const rptTypeFilter = params.rptType || "ALL";
        const fromStr = params.from;
        const toStr = params.to;
        const page = params.page || 1;
        const limit = params.limit || 10;
        const exportAll = params.exportAll || false;

        // Auto-reconciliation: Ensure any paid RPT transactions have a corresponding Payment record
        const paidRptTransactionsWithoutPayment = await prisma.transaction.findMany({
            where: {
                status: {
                    in: ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE", "RELEASED", "DELIVERED"]
                },
                type: {
                    OR: [
                        { category: { in: ["RPT", "Real Property Tax", "REAL PROPERTY TAX"], mode: "insensitive" } },
                        { code: { startsWith: "RPT", mode: "insensitive" } },
                        { name: { contains: "Real Property", mode: "insensitive" } },
                        { name: { contains: "Amilyar", mode: "insensitive" } },
                    ]
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

        if (paidRptTransactionsWithoutPayment.length > 0) {
            const transactionsWithPaymentEvidence = paidRptTransactionsWithoutPayment.filter((transaction) => {
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

            if (transactionsWithPaymentEvidence.length > 0) {
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
                                source: "rpt_transaction_reconciliation",
                                reconciledAt: new Date().toISOString(),
                                transactionPaidAt: transaction.updatedAt.toISOString()
                            }
                        };
                    }),
                    skipDuplicates: true
                });
            }
        }

        // Strict RPT filtering condition
        const rptTypeCondition: any = rptTypeFilter && rptTypeFilter !== "ALL"
            ? { code: rptTypeFilter }
            : {
                OR: [
                    { category: { in: ["RPT", "Real Property Tax", "REAL PROPERTY TAX"], mode: "insensitive" } },
                    { code: { startsWith: "RPT", mode: "insensitive" } },
                    { name: { contains: "Real Property", mode: "insensitive" } },
                    { name: { contains: "Amilyar", mode: "insensitive" } },
                ]
            };

        const whereClause: any = {
            transaction: {
                type: rptTypeCondition
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
                { orNumber: { contains: searchQuery, mode: "insensitive" } },
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

            whereClause.AND = [
                { transaction: { type: rptTypeCondition } },
                { OR: searchOrs }
            ];
            delete whereClause.transaction;
        }

        // Stats aggregation
        const [statsResult, totalCount, cat1Count, cat2Count, cat3Count] = await Promise.all([
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
            }),
            prisma.payment.count({
                where: {
                    ...whereClause,
                    transaction: { type: { code: "RPT_CAT1" } }
                }
            }),
            prisma.payment.count({
                where: {
                    ...whereClause,
                    transaction: { type: { code: "RPT_CAT2" } }
                }
            }),
            prisma.payment.count({
                where: {
                    ...whereClause,
                    transaction: { type: { code: "RPT_CAT3" } }
                }
            })
        ]);

        const totalPaid = statsResult._sum.amount || 0;
        const paidCount = statsResult._count.id || 0;
        const totalPages = Math.ceil(totalCount / limit);

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                transaction: {
                    select: {
                        id: true,
                        businessName: true,
                        residentSnapshot: true,
                        additionalData: true,
                        fiscalSnapshot: true,
                        status: true,
                        type: {
                            select: {
                                name: true,
                                category: true,
                                code: true
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
            skip: exportAll ? undefined : (page - 1) * limit,
            take: exportAll ? undefined : limit
        });

        return {
            success: true,
            data: payments,
            totalCount,
            totalPages,
            currentPage: page,
            stats: {
                totalPaid,
                paidCount,
                cat1Count,
                cat2Count,
                cat3Count
            }
        };
    } catch (error: any) {
        console.error("Failed to fetch RPT collections ledger:", error);
        return { success: false, error: error.message || "Failed to fetch RPT collections ledger." };
    }
}
