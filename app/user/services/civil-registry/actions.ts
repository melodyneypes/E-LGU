"use server";

import prisma from "@/lib/db/prisma";

export interface GetCivilRegistryFeedbacksInput {
    page?: number;
    limit?: number;
    rating?: string;
    search?: string;
}

export async function getCivilRegistryFeedbacksAction(input: GetCivilRegistryFeedbacksInput = {}) {
    try {
        const {
            page = 1,
            limit = 6,
            rating = "ALL",
            search = ""
        } = input;

        const baseCivilRegistryScope: any = {
            OR: [
                {
                    transaction: {
                        type: {
                            OR: [
                                { category: "Civil Registry" },
                                { category: "CIVIL_REGISTRY" }
                            ]
                        }
                    }
                },
                {
                    transactionType: {
                        OR: [
                            { category: "Civil Registry" },
                            { category: "CIVIL_REGISTRY" }
                        ]
                    }
                }
            ]
        };

        const whereClause: any = { ...baseCivilRegistryScope };

        if (rating !== "ALL") {
            whereClause.rating = rating;
        }

        if (search.trim()) {
            const query = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { comment: { contains: query, mode: "insensitive" } },
                        { user: { name: { contains: query, mode: "insensitive" } } },
                        { user: { residentProfile: { firstName: { contains: query, mode: "insensitive" } } } },
                        { user: { residentProfile: { lastName: { contains: query, mode: "insensitive" } } } },
                        { transactionType: { name: { contains: query, mode: "insensitive" } } }
                    ]
                }
            ];
        }

        // Strict select projection — NEVER SELECT *
        const selectFields = {
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
        };

        // Two-Tier Query: 1) Paginated items, 2) Filtered total, 3) All-time aggregate stats
        const [feedbacks, filteredTotal, allFeedbacksForStats] = await Promise.all([
            prisma.transactionFeedback.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
                select: selectFields
            }),
            prisma.transactionFeedback.count({ where: whereClause }),
            prisma.transactionFeedback.findMany({
                where: baseCivilRegistryScope,
                select: { rating: true }
            })
        ]);

        const RATING_NUM_MAP: Record<string, number> = {
            ONE: 1,
            TWO: 2,
            THREE: 3,
            FOUR: 4,
            FIVE: 5
        };

        const totalFeedbacksCount = allFeedbacksForStats.length;
        let sumRating = 0;
        const ratingCounts: Record<string, number> = {
            FIVE: 0,
            FOUR: 0,
            THREE: 0,
            TWO: 0,
            ONE: 0
        };

        for (const item of allFeedbacksForStats) {
            const num = RATING_NUM_MAP[item.rating] || 0;
            sumRating += num;
            if (ratingCounts[item.rating] !== undefined) {
                ratingCounts[item.rating]++;
            }
        }

        const averageRating = totalFeedbacksCount > 0 ? Number((sumRating / totalFeedbacksCount).toFixed(1)) : 0;
        const positiveCount = ratingCounts.FIVE + ratingCounts.FOUR;
        const csatPercentage = totalFeedbacksCount > 0 ? Math.round((positiveCount / totalFeedbacksCount) * 100) : 0;

        const hasMore = (page * limit) < filteredTotal;
        const remainingCount = Math.max(0, filteredTotal - (page * limit));

        return {
            success: true,
            data: JSON.parse(JSON.stringify(feedbacks)),
            pagination: {
                page,
                limit,
                totalCount: filteredTotal,
                hasMore,
                remainingCount
            },
            stats: {
                totalFeedbacks: totalFeedbacksCount,
                averageRating,
                csatPercentage,
                ratingCounts
            }
        };
    } catch (error: any) {
        console.error("getCivilRegistryFeedbacksAction error:", error);
        return {
            success: false,
            error: error.message || "Failed to load civil registry feedbacks.",
            data: [],
            pagination: { page: 1, limit: 6, totalCount: 0, hasMore: false, remainingCount: 0 },
            stats: {
                totalFeedbacks: 0,
                averageRating: 0,
                csatPercentage: 0,
                ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 }
            }
        };
    }
}
