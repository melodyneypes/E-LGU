"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getMayorPaymentsLedger(params: {
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

        if (!session || (userRole !== "MAYOR" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = params.to ? new Date(params.to) : new Date();
        toDate.setHours(23, 59, 59, 999);

        const whereClause: any = {
            createdAt: {
                gte: fromDate,
                lte: toDate
            }
        };

        if (params.method && params.method !== "ALL") {
            whereClause.method = params.method;
        }

        if (params.category && params.category !== "ALL") {
            whereClause.transaction = {
                ...(whereClause.transaction || {}),
                type: {
                    category: params.category
                }
            };
        }

        const targetBarangay = params.barangay && params.barangay !== "ALL" && params.barangay !== "Mapandan" ? params.barangay : null;
        if (targetBarangay) {
            whereClause.transaction = {
                ...(whereClause.transaction || {}),
                OR: [
                    {
                        user: {
                            residentProfile: {
                                barangay: targetBarangay
                            }
                        }
                    },
                    {
                        residentSnapshot: {
                            path: ["barangay"],
                            string_contains: targetBarangay
                        }
                    },
                    {
                        residentSnapshot: {
                            string_contains: targetBarangay
                        }
                    }
                ]
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
                            category: true
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

        let rawPayments: any[] = [];
        let totalCount = 0;

        if (searchPattern) {
            const allCandidatePayments = await (prisma as any).payment.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                select: selectFields
            });

            const filtered = allCandidatePayments.filter((pm: any) => {
                const pmIdMatch = pm.id?.toLowerCase().includes(searchPattern);
                const refMatch = pm.reference?.toLowerCase().includes(searchPattern);
                const orMatch = pm.orNumber?.toLowerCase().includes(searchPattern);
                const txIdMatch = pm.transaction?.id?.toLowerCase().includes(searchPattern);
                const typeNameMatch = pm.transaction?.type?.name?.toLowerCase().includes(searchPattern);
                const userNameMatch = pm.transaction?.user?.name?.toLowerCase().includes(searchPattern);
                const userEmailMatch = pm.transaction?.user?.email?.toLowerCase().includes(searchPattern);

                const snapshotStr = typeof pm.transaction?.residentSnapshot === "string"
                    ? pm.transaction.residentSnapshot.toLowerCase()
                    : JSON.stringify(pm.transaction?.residentSnapshot || {}).toLowerCase();

                const additionalStr = typeof pm.transaction?.additionalData === "string"
                    ? pm.transaction.additionalData.toLowerCase()
                    : JSON.stringify(pm.transaction?.additionalData || {}).toLowerCase();

                const snapshotMatch = snapshotStr.includes(searchPattern);
                const additionalMatch = additionalStr.includes(searchPattern);

                return pmIdMatch || refMatch || orMatch || txIdMatch || typeNameMatch || userNameMatch || userEmailMatch || snapshotMatch || additionalMatch;
            });

            totalCount = filtered.length;
            rawPayments = filtered.slice(skip, skip + limit);
        } else {
            const [pmList, count] = await Promise.all([
                (prisma as any).payment.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                    select: selectFields
                }),
                (prisma as any).payment.count({ where: whereClause })
            ]);

            rawPayments = pmList;
            totalCount = count;
        }

        const paidAggregate = await (prisma as any).payment.aggregate({
            _sum: { amount: true },
            _count: { _all: true },
            where: {
                ...whereClause,
                status: "PAID"
            }
        });

        const pendingCount = await (prisma as any).payment.count({
            where: {
                ...whereClause,
                status: "PENDING"
            }
        });

        const totalRev = paidAggregate._sum.amount || 0;
        const paidCnt = paidAggregate._count._all || 0;

        const stats = {
            totalCount,
            totalRevenue: totalRev,
            paidCount: paidCnt,
            pendingCount,
            avgPayment: paidCnt > 0 ? totalRev / paidCnt : 0
        };

        const totalPages = Math.ceil(totalCount / limit) || 1;

        return {
            success: true,
            payments: rawTransactionsToPayments(rawPayments),
            totalCount,
            totalPages,
            currentPage: page,
            stats
        };
    } catch (error: any) {
        console.error("Error in getMayorPaymentsLedger server action:", error);
        return { success: false, error: "Failed to load payments ledger." };
    }
}

function rawTransactionsToPayments(payments: any[]) {
    return payments.map((pm) => ({
        id: pm.id,
        amount: pm.amount,
        method: pm.method,
        status: pm.status,
        reference: pm.reference,
        orNumber: pm.orNumber,
        createdAt: pm.createdAt,
        transactionId: pm.transaction?.id,
        serviceType: pm.transaction?.type?.name || "N/A",
        serviceCategory: pm.transaction?.type?.category || "N/A",
        user: pm.transaction?.user || null,
        residentSnapshot: pm.transaction?.residentSnapshot || null,
        additionalData: pm.transaction?.additionalData || null
    }));
}
