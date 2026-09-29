import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mail";
import { isEngineeringPermitCode } from "@/lib/transactions/engineering-permit";
import { recordTransactionRejection } from "@/lib/transactions/rejection-tracker";

async function runCleanup(options?: { forceToday?: boolean }) {
    // Get current date and hour in Manila time (Asia/Manila)
    const now = new Date();
    const manilaDateString = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);
    const [month, day, year] = manilaDateString.split("/");

    const manilaHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            hour: "numeric",
            hour12: false
        }).format(now),
        10
    );

    // Business Rule (Option A):
    // Office hours close at 5:00 PM (17:00).
    // - Before 5:00 PM: Only appointments from PAST days (< startOfTodayManila) are expired.
    // - 5:00 PM onwards OR if forceToday is enabled: Today's appointments (<= endOfTodayManila) are also expired.
    const isPastOfficeHours = manilaHour >= 17;
    const shouldIncludeToday = isPastOfficeHours || options?.forceToday === true;

    const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const endOfTodayManila = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

    const appointmentDateCondition = shouldIncludeToday
        ? { lte: endOfTodayManila }
        : { lt: startOfTodayManila };

    // Fetch transactions scheduled within the cutoff window that are pending inspection/requesting/booked or unpaid appointments
    const candidates = await prisma.transaction.findMany({
        where: {
            appointmentDate: appointmentDateCondition,
            status: {
                in: ["FOR_REQUESTING", "FOR_INSPECTION", "BOOKED", "UNPAID"]
            },
            isPaid: false,
            isCancelled: false
        },
        include: {
            type: true,
            user: true
        }
    });

    const toRejectIds: string[] = [];
    const missedTxsMap = new Map<string, typeof candidates[0]>();

    for (const tx of candidates) {
        const rawAddData = tx.additionalData;
        const addData = typeof rawAddData === "string" 
            ? (() => { try { return JSON.parse(rawAddData); } catch { return {}; } })()
            : (rawAddData || {});

        const isCheckedIn = addData.checkedIn === true;
        const hasCounter = !!addData.counterName;

        // Reject if resident missed the appointment: not checked in within the day, not called to a counter, and unpaid
        if (!isCheckedIn && !hasCounter && !tx.isPaid) {
            toRejectIds.push(tx.id);
            missedTxsMap.set(tx.id, tx);
        }
    }

    if (toRejectIds.length > 0) {
        const rejectionRemarks = "Appointment slot expired — Resident failed to check in within the scheduled date.";
        const nowIso = new Date().toISOString();

        // 1. Update each transaction cleanly, preserving additionalData while synchronizing department & assessor statuses
        for (const txId of toRejectIds) {
            const tx = missedTxsMap.get(txId);
            const currentAddData = (tx?.additionalData as any) || {};
            const isRptService = tx?.type?.category?.toUpperCase() === "RPT" || tx?.type?.code?.toUpperCase().includes("RPT");

            const updatedAddData: Record<string, any> = {
                ...currentAddData,
                autoExpiredByCron: true,
                expiredAt: nowIso,
            };

            // If this is an Assessor Real Property Tax (RPT) application, synchronize assessorStatus as REJECTED
            if (isRptService || currentAddData.assessorStatus) {
                updatedAddData.assessorStatus = "REJECTED";
            }

            await prisma.transaction.update({
                where: { id: txId },
                data: {
                    isCancelled: true,
                    status: "REJECTED",
                    rejectionRemarks,
                    additionalData: updatedAddData
                }
            });

            // Synchronize RealPropertyTax table record if it exists
            if (isRptService && (prisma as any).realPropertyTax) {
                try {
                    await (prisma as any).realPropertyTax.updateMany({
                        where: { transactionId: txId },
                        data: { assessorStatus: "REJECTED" }
                    });
                } catch (rptErr) {
                    console.error(`[Cron] RealPropertyTax sync error for tx ${txId}:`, rptErr);
                }
            }
        }

        // 2. Group missed transactions by user to prevent duplicate penalty calls per user in loop
        const userMissedTxs = candidates.filter(c => toRejectIds.includes(c.id));
        const userCategoryMap = new Map<string, Set<string>>();

        for (const missedTx of userMissedTxs) {
            if (missedTx.userId) {
                const categoryKey = isEngineeringPermitCode(missedTx.type?.code)
                    ? missedTx.type?.code
                    : (missedTx.type?.category || "General");

                if (!userCategoryMap.has(missedTx.userId)) {
                    userCategoryMap.set(missedTx.userId, new Set());
                }
                userCategoryMap.get(missedTx.userId)!.add(categoryKey || "General");
            }
        }

        // Record rejection penalty once per unique user & category
        for (const [userId, categories] of userCategoryMap.entries()) {
            let updatedUser: any = null;
            for (const catKey of categories) {
                updatedUser = await recordTransactionRejection(userId, catKey);
            }

            // Send notification email to the resident if account has not exceeded maximum rejection limit
            const missedForUser = userMissedTxs.filter(tx => tx.userId === userId);
            for (const missedTx of missedForUser) {
                if (updatedUser && updatedUser.email && (updatedUser.rejectionCount ?? 0) < 3) {
                    const resident = missedTx.residentSnapshot as any;
                    sendEmail({
                        type: "REJECTED",
                        to: updatedUser.email,
                        name: resident?.firstName || updatedUser.name || "Resident",
                        remarks: rejectionRemarks,
                        transactionId: missedTx.id.slice(-8).toUpperCase(),
                        serviceName: missedTx.type?.name
                    }).catch(err => console.error("Rejection email error in cron:", err));
                }
            }
        }
    }

    return {
        processed: candidates.length,
        rejected: toRejectIds.length,
        isPastOfficeHours,
        includedToday: shouldIncludeToday
    };
}

// POST endpoint for QStash scheduled cron requests
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret");
        const force = searchParams.get("force") === "true";
        const cronSecret = process.env.CRON_SECRET;

        const isAuthorized = !cronSecret || (
            authHeader === `Bearer ${cronSecret}` ||
            secret === cronSecret
        );

        if (!isAuthorized) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const result = await runCleanup({ forceToday: force });
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("Cron appointment cleanup failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET endpoint for manual testing (protected via query param ?secret=...)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret");
        const force = searchParams.get("force") === "true";
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && secret !== cronSecret) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const result = await runCleanup({ forceToday: force });
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("Cron appointment cleanup manual trigger failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
