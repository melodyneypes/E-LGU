"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getMayorTransactionReportData(params: {
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

        if (!session || (userRole !== "MAYOR" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

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

        if (params.category && params.category !== "ALL") {
            whereClause.type = {
                category: params.category
            };
        }

        if (params.status && params.status !== "ALL") {
            whereClause.status = params.status;
        }

        const targetBarangay = params.barangay && params.barangay !== "ALL" && params.barangay !== "{{LGU_NAME}}" && params.barangay !== "E-LGU" ? params.barangay : null;
        if (targetBarangay) {
            whereClause.OR = [
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
            ];
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const isExportAll = params.exportAll === true;

        const searchPattern = params.search ? params.search.trim().toLowerCase() : "";

        // If searching, fetch base filtered transactions (by date/status/category/barangay) and perform in-memory matching on JSON stringified snapshot fields
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
                    _count: { _all: true }
                }),
                (prisma as any).payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        status: "PAID",
                        transaction: whereClause
                    }
                })
            ]);

            aggregateStats = aggStats;
            releasedRevenueAgg = revAgg;

            const filtered = allCandidateTxs.filter((tx: any) => {
                const txIdMatch = tx.id?.toLowerCase().includes(searchPattern);
                const typeNameMatch = tx.type?.name?.toLowerCase().includes(searchPattern);
                const userNameMatch = tx.user?.name?.toLowerCase().includes(searchPattern);
                const userEmailMatch = tx.user?.email?.toLowerCase().includes(searchPattern);

                const snapshotStr = typeof tx.residentSnapshot === "string" 
                    ? tx.residentSnapshot.toLowerCase() 
                    : JSON.stringify(tx.residentSnapshot || {}).toLowerCase();

                const additionalStr = typeof tx.additionalData === "string"
                    ? tx.additionalData.toLowerCase()
                    : JSON.stringify(tx.additionalData || {}).toLowerCase();

                const snapshotMatch = snapshotStr.includes(searchPattern);
                const additionalMatch = additionalStr.includes(searchPattern);

                return txIdMatch || typeNameMatch || userNameMatch || userEmailMatch || snapshotMatch || additionalMatch;
            });

            totalCount = filtered.length;
            rawTransactions = isExportAll 
                ? filtered 
                : filtered.slice((page - 1) * limit, page * limit);
        } else {
            const [txs, count, aggStats, revAgg] = await Promise.all([
                (prisma as any).transaction.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    ...(isExportAll ? {} : { skip: (page - 1) * limit, take: limit }),
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                        residentSnapshot: true,
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
                    _count: { _all: true }
                }),
                (prisma as any).payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        status: "PAID",
                        transaction: whereClause
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

        aggregateStats.forEach((group: any) => {
            const count = group._count._all;
            if (group.status === "RELEASED") {
                stats.released += count;
            } else if (group.status === "REJECTED") {
                stats.rejected += count;
            } else {
                stats.pending += count;
            }
        });

        const totalPages = isExportAll ? 1 : Math.ceil(totalCount / limit) || 1;

        return {
            success: true,
            transactions: rawTransactions,
            totalCount,
            totalPages,
            currentPage: page,
            stats
        };
    } catch (error: any) {
        console.error("Error in getMayorTransactionReportData server action:", error);
        return { success: false, error: "Failed to load report data." };
    }
}
