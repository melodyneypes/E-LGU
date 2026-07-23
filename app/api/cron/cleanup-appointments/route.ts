import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mail";
import { isEngineeringPermitCode } from "@/lib/transactions/engineering-permit";

async function runCleanup() {
    // Get start of today Manila time
    const manilaDateString = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    const [month, day, year] = manilaDateString.split("/");
    const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    // Fetch transactions scheduled before today that are pending inspection/requesting
    const candidates = await prisma.transaction.findMany({
        where: {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                in: ["FOR_REQUESTING", "FOR_INSPECTION"]
            },
            isCancelled: false
        },
        include: {
            type: true,
            user: true
        }
    });

    const toRejectIds: string[] = [];
    const usersToUpdate: Set<string> = new Set();

    for (const tx of candidates) {
        const addData = (tx.additionalData as any) || {};
        const isCheckedIn = addData.checkedIn === true;
        const hasCounter = !!addData.counterName;

        // Only reject if they missed the appointment (no check-in and not called to counter)
        if (!isCheckedIn && !hasCounter) {
            toRejectIds.push(tx.id);
            if (tx.userId && tx.user?.role === "USER") {
                usersToUpdate.add(tx.userId);
            }
        }
    }

    if (toRejectIds.length > 0) {
        // 1. Update transactions to REJECTED status
        await prisma.transaction.updateMany({
            where: {
                id: { in: toRejectIds }
            },
            data: {
                isCancelled: true,
                status: "REJECTED",
                rejectionRemarks: "Appointment slot expired / missed"
            }
        });

        // 2. Recalculate category strikes for each affected user
        for (const userId of usersToUpdate) {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!dbUser) continue;

            const rejectedTransactions = await prisma.transaction.findMany({
                where: {
                    userId,
                    status: "REJECTED",
                    createdAt: dbUser.rejectionResetAt ? { gt: dbUser.rejectionResetAt } : undefined
                },
                include: {
                    type: true
                }
            });

            let maxCategoryRejections = 0;
            const buildingPermitRejections = rejectedTransactions.filter((rTx: any) => rTx.type?.code === "BUILDING_PERMIT").length;
            const occupancyPermitRejections = rejectedTransactions.filter((rTx: any) => rTx.type?.code === "OCCUPANCY_PERMIT").length;

            const categoryCounts: Record<string, number> = {};
            for (const rTx of rejectedTransactions) {
                if (isEngineeringPermitCode(rTx.type?.code)) continue;
                const category = rTx.type?.category || "General";
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }

            maxCategoryRejections = Math.max(
                buildingPermitRejections,
                occupancyPermitRejections,
                0,
                ...Object.values(categoryCounts)
            );

            // Update user rejection strike count
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { rejectionCount: maxCategoryRejections } as any
            });

            // Check if deactivation threshold (3 strikes in any single category) is reached
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
                    }).catch(err => console.error("Deactivation email error in cron:", err));
                }
            } else {
                // Otherwise send the standard rejection notification email for each missed appointment
                const userMissedTxs = candidates.filter(c => c.userId === userId && toRejectIds.includes(c.id));
                for (const missedTx of userMissedTxs) {
                    if (updatedUser.email) {
                        const resident = missedTx.residentSnapshot as any;
                        sendEmail({
                            type: "REJECTED",
                            to: updatedUser.email,
                            name: resident?.firstName || updatedUser.name || "Resident",
                            remarks: "Appointment slot expired / missed",
                            transactionId: missedTx.id.slice(-8).toUpperCase(),
                            serviceName: missedTx.type?.name
                        }).catch(err => console.error("Rejection email error in cron:", err));
                    }
                }
            }
        }
    }

    return {
        processed: candidates.length,
        rejected: toRejectIds.length,
        usersUpdated: usersToUpdate.size
    };
}

// POST endpoint for QStash scheduled cron requests
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret");
        const cronSecret = process.env.CRON_SECRET;

        const isAuthorized = cronSecret && (
            authHeader === `Bearer ${cronSecret}` ||
            secret === cronSecret
        );

        if (!isAuthorized) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const result = await runCleanup();
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
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || secret !== cronSecret) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const result = await runCleanup();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("Cron appointment cleanup manual trigger failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
