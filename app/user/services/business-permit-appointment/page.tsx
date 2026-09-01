import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BusinessPermitAppointmentClient } from "./BusinessPermitAppointmentClient";

export const dynamic = "force-dynamic";

export default async function BusinessPermitAppointmentPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        settings,
        userWithResident,
        businessTypes,
        bploConfigRaw,
        bookedSlots,
        activeTransactions,
        previousPermitsRaw
    ] = await Promise.all([
        getMultipleSystemSettings([
            "theme_color", 
            "logo", 
            "brand_word_1", 
            "brand_word_2",
            "bplo_tax_rate_new",
            "bplo_health_card_fee",
            "bplo_retail_tax_rate_low",
            "bplo_retail_tax_rate_high",
            "bplo_manufacturer_tax_rate",
            "bplo_wholesaler_tax_rate",
            "bplo_mayors_permit_matrix",
            "bplo_sanitary_fee_matrix",
            "bplo_garbage_fee_matrix",
            "bplo_mayors_tax_clearance_fee"
        ]),
        prisma.user.findUnique({
            where: { id: session.user.id },
            include: { residentProfile: true }
        }),
        prisma.transactionType.findMany({
            where: {
                isActive: true,
                code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
            }
        }),
        prisma.appointmentConfig.findUnique({
            where: { department: "BPLO" }
        }),
        prisma.transaction.findMany({
            where: {
                appointmentDate: { gte: todayStart },
                isCancelled: false,
                type: {
                    code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
                }
            },
            select: {
                appointmentDate: true,
                appointmentSlot: true
            }
        }),
        prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } },
                status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
                isCancelled: false
            },
            select: {
                id: true,
                type: { select: { code: true } }
            }
        }),
        prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                status: { in: ["DELIVERED", "RELEASED"] },
                type: { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } }
            },
            include: {
                type: true,
                businessPermit: true
            },
            orderBy: { createdAt: "desc" },
            take: 10
        })
    ]);

    const themeColor = settings.get("theme_color") || "#2563eb";
    const branding = {
        logo: settings.get("logo") || null,
        word1: settings.get("brand_word_1") || "MUNICIPALITY",
        word2: settings.get("brand_word_2") || "PORTAL",
    };

    const bploSettings = {
        bplo_tax_rate_new: settings.get("bplo_tax_rate_new") || "0.0005",
        bplo_health_card_fee: settings.get("bplo_health_card_fee") || "100.00",
        bplo_mayors_tax_clearance_fee: settings.get("bplo_mayors_tax_clearance_fee") || "85.00",
        bplo_retail_tax_rate_low: settings.get("bplo_retail_tax_rate_low") || "0.022",
        bplo_retail_tax_rate_high: settings.get("bplo_retail_tax_rate_high") || "0.011",
        bplo_manufacturer_tax_rate: settings.get("bplo_manufacturer_tax_rate") || "0.004125",
        bplo_wholesaler_tax_rate: settings.get("bplo_wholesaler_tax_rate") || "0.0055",
        bplo_mayors_permit_matrix: settings.get("bplo_mayors_permit_matrix") || "",
        bplo_sanitary_fee_matrix: settings.get("bplo_sanitary_fee_matrix") || "",
        bplo_garbage_fee_matrix: settings.get("bplo_garbage_fee_matrix") || ""
    };

    const bploConfig = bploConfigRaw || {
        department: "BPLO",
        maxSlots: 50,
        maxSlotsAM: 25,
        maxSlotsPM: 25,
        blockedDates: [],
        activeDays: [1, 2, 3, 4, 5]
    };

    const hasActiveNew = activeTransactions.some(t => t.type?.code === "BUSINESS_PERMIT_NEW");
    const hasActiveRenew = activeTransactions.some(t => t.type?.code === "BUSINESS_PERMIT_RENEW");

    const uniqueBusinessesMap: Record<string, any> = {};
    previousPermitsRaw.forEach((tx: any) => {
        const bizName = tx.additionalData?.businessName?.trim().toUpperCase();
        if (bizName && !uniqueBusinessesMap[bizName]) {
            uniqueBusinessesMap[bizName] = tx;
        }
    });
    const previousPermits = Object.values(uniqueBusinessesMap);

    // Fetch Business Permit feedbacks and compute CSAT metrics
    const baseBploScope = {
        OR: [
            { department: "BPLO" },
            {
                transaction: {
                    type: {
                        OR: [
                            { category: "BUSINESS_PERMIT" },
                            { category: "Business Permit" },
                            { category: "BUSINESS PERMIT" },
                            { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } },
                            { code: { startsWith: "BUSINESS_PERMIT" } }
                        ]
                    }
                }
            },
            {
                transactionType: {
                    OR: [
                        { category: "BUSINESS_PERMIT" },
                        { category: "Business Permit" },
                        { category: "BUSINESS PERMIT" },
                        { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } },
                        { code: { startsWith: "BUSINESS_PERMIT" } }
                    ]
                }
            }
        ]
    };

    const [bploFeedbacks, allBploRatings, totalBploCount] = await Promise.all([
        prisma.transactionFeedback.findMany({
            where: baseBploScope,
            orderBy: { createdAt: "desc" },
            take: 12,
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
        prisma.transactionFeedback.findMany({
            where: baseBploScope,
            select: { rating: true }
        }),
        prisma.transactionFeedback.count({ where: baseBploScope })
    ]);

    const RATING_NUM_MAP: Record<string, number> = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5
    };

    const totalFeedbacksCount = allBploRatings.length;
    let sumRating = 0;
    const ratingCounts: Record<string, number> = {
        FIVE: 0,
        FOUR: 0,
        THREE: 0,
        TWO: 0,
        ONE: 0
    };

    for (const item of allBploRatings) {
        const num = RATING_NUM_MAP[item.rating] || 0;
        sumRating += num;
        if (ratingCounts[item.rating] !== undefined) {
            ratingCounts[item.rating]++;
        }
    }

    const averageRating = totalFeedbacksCount > 0 ? Number((sumRating / totalFeedbacksCount).toFixed(1)) : 0;
    const positiveCount = ratingCounts.FIVE + ratingCounts.FOUR;
    const csatPercentage = totalFeedbacksCount > 0 ? Math.round((positiveCount / totalFeedbacksCount) * 100) : 0;

    const feedbackStats = {
        totalFeedbacks: totalFeedbacksCount,
        averageRating,
        csatPercentage,
        ratingCounts
    };

    const initialPagination = {
        page: 1,
        limit: 12,
        totalCount: totalBploCount,
        hasMore: 12 < totalBploCount,
        remainingCount: Math.max(0, totalBploCount - 12)
    };

    return (
        <BusinessPermitAppointmentClient
            resident={userWithResident?.residentProfile || null}
            businessTypes={businessTypes}
            themeColor={themeColor}
            branding={branding}
            config={bploConfig as any}
            bookedSlots={bookedSlots as any[]}
            hasActiveNew={hasActiveNew}
            hasActiveRenew={hasActiveRenew}
            previousPermits={previousPermits}
            bploSettings={bploSettings}
            feedbacks={JSON.parse(JSON.stringify(bploFeedbacks))}
            feedbackStats={feedbackStats}
            initialPagination={initialPagination}
        />
    );
}
