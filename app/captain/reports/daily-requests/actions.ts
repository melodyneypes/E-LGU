"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCaptainTransactionReportData(params: {
    from?: string;
    to?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    exportAll?: boolean;
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

        const fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = params.to ? new Date(params.to) : new Date();
        toDate.setHours(23, 59, 59, 999);

        // Level 0 constraint and strict Barangay matching
        const whereClause: any = {
            createdAt: {
                gte: fromDate,
                lte: toDate
            },
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
        };

        if (params.category && params.category !== "ALL") {
            whereClause.type = {
                ...whereClause.type,
                category: params.category
            };
        }

        if (params.status && params.status !== "ALL") {
            whereClause.status = params.status;
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const isExportAll = params.exportAll === true;
        const searchPattern = params.search ? params.search.trim().toLowerCase() : "";

        let rawTransactions: any[] = [];
        let totalCount = 0;
        let aggregateStats: any[] = [];
        let releasedRevenueAgg: any = { _sum: { amount: 0 } };

        if (searchPattern) {
            const [allCandidateTxs, aggStats, revAgg] = await Promise.all([
                (prisma as any).transaction.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        createdAt: true,
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
                        },
                        payment: {
                            select: {
                                amount: true,
                                status: true,
                                method: true
                            }
                        }
                    }
                }),
                (prisma as any).transaction.groupBy({
                    by: ["status"],
                    where: whereClause,
                    _count: { status: true }
                }),
                (prisma as any).payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        status: "PAID",
                        transaction: {
                            ...whereClause,
                            status: "RELEASED"
                        }
                    }
                })
            ]);

            aggregateStats = aggStats;
            releasedRevenueAgg = revAgg;

            const filteredBySearch = allCandidateTxs.filter((tx: any) => {
                const txIdMatch = tx.id.toLowerCase().includes(searchPattern);
                const typeNameMatch = tx.type?.name?.toLowerCase().includes(searchPattern) ?? false;
                const userNameMatch = tx.user?.name?.toLowerCase().includes(searchPattern) ?? false;

                let snapshotMatch = false;
                if (tx.residentSnapshot) {
                    const snapStr = typeof tx.residentSnapshot === "string" ? tx.residentSnapshot : JSON.stringify(tx.residentSnapshot);
                    snapshotMatch = snapStr.toLowerCase().includes(searchPattern);
                }

                return txIdMatch || typeNameMatch || userNameMatch || snapshotMatch;
            });

            totalCount = filteredBySearch.length;
            if (isExportAll) {
                rawTransactions = filteredBySearch;
            } else {
                const startIndex = (page - 1) * limit;
                rawTransactions = filteredBySearch.slice(startIndex, startIndex + limit);
            }
        } else {
            const [txs, count, aggStats, revAgg] = await Promise.all([
                (prisma as any).transaction.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    skip: isExportAll ? undefined : (page - 1) * limit,
                    take: isExportAll ? undefined : limit,
                    select: {
                        id: true,
                        createdAt: true,
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
                        },
                        payment: {
                            select: {
                                amount: true,
                                status: true,
                                method: true
                            }
                        }
                    }
                }),
                (prisma as any).transaction.count({ where: whereClause }),
                (prisma as any).transaction.groupBy({
                    by: ["status"],
                    where: whereClause,
                    _count: { status: true }
                }),
                (prisma as any).payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        status: "PAID",
                        transaction: {
                            ...whereClause,
                            status: "RELEASED"
                        }
                    }
                })
            ]);

            rawTransactions = txs;
            totalCount = count;
            aggregateStats = aggStats;
            releasedRevenueAgg = revAgg;
        }

        const stats = {
            total: totalCount,
            pending: 0,
            released: 0,
            rejected: 0,
            revenue: releasedRevenueAgg._sum.amount || 0
        };

        aggregateStats.forEach((st: any) => {
            if (st.status === "PENDING") stats.pending = st._count.status;
            if (st.status === "RELEASED") stats.released = st._count.status;
            if (st.status === "REJECTED") stats.rejected = st._count.status;
        });

        const totalPages = isExportAll ? 1 : Math.ceil(totalCount / limit) || 1;

        const transactions = rawTransactions.map((tx: any) => ({
            id: tx.id,
            createdAt: tx.createdAt.toISOString(),
            status: tx.status,
            residentSnapshot: tx.residentSnapshot,
            type: tx.type,
            user: tx.user,
            payment: tx.payment
        }));

        return {
            success: true,
            transactions,
            totalCount,
            totalPages,
            currentPage: page,
            stats
        };
    } catch (error: any) {
        console.error("Error in getCaptainTransactionReportData:", error);
        return { success: false, error: error.message || "Failed to retrieve transaction reports" };
    }
}
