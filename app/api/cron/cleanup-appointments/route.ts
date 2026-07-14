import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

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
        }
    });

    const toRejectIds: string[] = [];

    for (const tx of candidates) {
        const addData = (tx.additionalData as any) || {};
        const isCheckedIn = addData.checkedIn === true;
        const hasCounter = !!addData.counterName;

        // Only reject if they missed the appointment (no check-in and not called to counter)
        if (!isCheckedIn && !hasCounter) {
            toRejectIds.push(tx.id);
        }
    }

    if (toRejectIds.length > 0) {
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
    }

    return {
        processed: candidates.length,
        rejected: toRejectIds.length
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
