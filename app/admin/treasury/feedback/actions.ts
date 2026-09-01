"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FeedbackRating } from "@prisma/client";

export interface TreasuryFeedbackFilters {
    rating?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

const RATING_NUM_MAP: Record<FeedbackRating, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
};

export async function getTreasuryFeedbackAction(filters: TreasuryFeedbackFilters = {}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        const isAllowed =
            user?.role === "TREASURY_STAFF" ||
            (user?.role === "ADMIN" && (user?.department?.toUpperCase() === "LGU" || user?.department?.toUpperCase() === "TREASURY" || !user?.department));

        if (!isAllowed) {
            return { success: false, error: "Unauthorized: Access restricted to Treasury Staff and LGU Admin." };
        }

        const {
            rating = "ALL",
            search = "",
            from,
            to,
            page = 1,
            limit = 10
        } = filters;

        // Base where clause strictly for CEDULA and POSO transaction types
        const baseTreasuryScope = {
            OR: [
                {
                    transaction: {
                        type: {
                            OR: [
                                { category: { in: ["CEDULA", "POSO"] } },
                                { code: { in: ["CEDULA", "POSO", "POSO_CITATION"] } }
                            ]
                        }
                    }
                },
                {
                    transactionType: {
                        OR: [
                            { category: { in: ["CEDULA", "POSO"] } },
                            { code: { in: ["CEDULA", "POSO", "POSO_CITATION"] } }
                        ]
                    }
                }
            ]
        };

        const whereClause: any = {
            ...baseTreasuryScope
        };

        // Filter by Rating Enum
        if (rating !== "ALL" && ["ONE", "TWO", "THREE", "FOUR", "FIVE"].includes(rating)) {
            whereClause.rating = rating as FeedbackRating;
        }

        // Filter by Date Range
        if (from || to) {
            whereClause.createdAt = {};
            if (from) {
                whereClause.createdAt.gte = new Date(from);
            }
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = toDate;
            }
        }

        // Filter by Search (Citizen Name, Queue Number, or Comment keywords)
        if (search && search.trim()) {
            const query = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { comment: { contains: query, mode: "insensitive" } },
                        { user: { name: { contains: query, mode: "insensitive" } } },
                        { transaction: { queueNumber: { contains: query, mode: "insensitive" } } },
                        {
                            transaction: {
                                user: {
                                    residentProfile: {
                                        OR: [
                                            { firstName: { contains: query, mode: "insensitive" } },
                                            { lastName: { contains: query, mode: "insensitive" } }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            ];
        }

        const skip = (page - 1) * limit;

        // Run queries in parallel: Paginated feedbacks, Total Count, and Full Dataset for Stats
        const [feedbacks, totalCount, allTreasuryFeedbacks] = await Promise.all([
            prisma.transactionFeedback.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            residentProfile: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    },
                    transaction: {
                        select: {
                            id: true,
                            queueNumber: true,
                            status: true,
                            type: {
                                select: {
                                    id: true,
                                    name: true,
                                    category: true
                                }
                            }
                        }
                    },
                    transactionType: {
                        select: {
                            id: true,
                            name: true,
                            category: true
                        }
                    }
                }
            }),
            prisma.transactionFeedback.count({
                where: whereClause
            }),
            prisma.transactionFeedback.findMany({
                where: baseTreasuryScope,
                select: {
                    rating: true
                }
            })
        ]);

        // Compute Treasury CSAT Metrics
        const totalAll = allTreasuryFeedbacks.length;
        let sumRating = 0;
        const ratingCounts: Record<string, number> = {
            FIVE: 0,
            FOUR: 0,
            THREE: 0,
            TWO: 0,
            ONE: 0
        };

        for (const item of allTreasuryFeedbacks) {
            const num = RATING_NUM_MAP[item.rating] || 0;
            sumRating += num;
            if (ratingCounts[item.rating] !== undefined) {
                ratingCounts[item.rating]++;
            }
        }

        const averageRating = totalAll > 0 ? Number((sumRating / totalAll).toFixed(1)) : 0;
        const positiveCount = ratingCounts.FIVE + ratingCounts.FOUR;
        const csatPercentage = totalAll > 0 ? Math.round((positiveCount / totalAll) * 100) : 0;

        return {
            success: true,
            data: feedbacks,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
                currentPage: page,
                limit
            },
            stats: {
                totalFeedbacks: totalAll,
                averageRating,
                csatPercentage,
                ratingCounts
            }
        };
    } catch (error: any) {
        console.error("[getTreasuryFeedbackAction] Error:", error);
        return {
            success: false,
            error: error.message || "Failed to fetch citizen feedback records."
        };
    }
}
