import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mail";

/**
 * Record a transaction rejection for a user.
 * Increments consecutive rejection count for the given transaction category/type.
 * Locks account if max consecutive strikes in any category reaches 3.
 */
export async function recordTransactionRejection(
    userId: string,
    categoryOrCode: string,
    remarks?: string
) {
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            rejectionResetAt: true,
            consecutiveRejections: true,
            rejectionCount: true,
        } as any
    }) as any;

    if (!user || user.role !== "USER") return null;

    // Fetch actual rejected transactions since the user's rejectionResetAt (or all time if null)
    const rejectedTxs = await prisma.transaction.findMany({
        where: {
            userId: userId,
            status: "REJECTED",
            createdAt: user.rejectionResetAt ? { gt: user.rejectionResetAt } : undefined
        },
        include: {
            type: true
        }
    });

    // Group actual rejected transactions by category / code
    const updatedMap: Record<string, number> = {};
    for (const rTx of rejectedTxs) {
        const cat = rTx.type?.category || rTx.type?.code || "General";
        updatedMap[cat] = (updatedMap[cat] || 0) + 1;
    }

    // Ensure the current category being rejected has at least 1 count (if query hasn't committed yet)
    const key = categoryOrCode || "General";
    if (!updatedMap[key] || updatedMap[key] === 0) {
        updatedMap[key] = 1;
    }

    // Overall rejectionCount is the maximum consecutive count across all categories
    const newMaxStrike = Math.max(0, ...Object.values(updatedMap));

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            consecutiveRejections: updatedMap,
            rejectionCount: newMaxStrike
        } as any
    }) as any;

    // Check for deactivation threshold (3 consecutive rejections in any single category)
    if (updatedUser.rejectionCount >= 3) {
        await prisma.user.update({
            where: { id: userId },
            data: { isEmailVerified: false }
        });

        if (updatedUser.email) {
            sendEmail({
                type: "DEACTIVATED",
                to: updatedUser.email,
                name: updatedUser.name || "Resident",
            }).catch(err => console.error("Deactivation email error:", err));
        }
    }

    return updatedUser;
}

/**
 * Clear/reset consecutive rejections for a user upon a successful transaction or payment.
 * If a category is provided, resets that category to 0.
 * If no category is provided, clears all category rejection counters to 0.
 */
export async function clearCategoryRejection(
    userId: string,
    categoryOrCode?: string
) {
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            consecutiveRejections: true,
        } as any
    }) as any;

    if (!user) return null;

    const currentMap = (user.consecutiveRejections as Record<string, number>) || {};
    let updatedMap: Record<string, number> = {};

    if (categoryOrCode) {
        updatedMap = {
            ...currentMap,
            [categoryOrCode]: 0
        };
    } else {
        // Clear all categories
        for (const k of Object.keys(currentMap)) {
            updatedMap[k] = 0;
        }
    }

    const newMaxStrike = Math.max(0, ...Object.values(updatedMap));

    return await prisma.user.update({
        where: { id: userId },
        data: {
            consecutiveRejections: updatedMap,
            rejectionCount: newMaxStrike,
            rejectionResetAt: new Date()
        } as any
    }) as any;
}
