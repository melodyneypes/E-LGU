import { NextResponse } from "next/server";
import { injectDailyFollowUpQueue } from "@/app/admin/rhu/actions";

// POST endpoint for automated daily midnight cron triggers (QStash, Vercel Cron, external scheduler)
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

        // Allow execution if authorized or if CRON_SECRET is not configured in local development
        if (cronSecret && !isAuthorized) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        console.log("[Cron: RHU Follow-Up Queue Injection] Running daily midnight automated injection...");
        const result = await injectDailyFollowUpQueue();
        console.log("[Cron: RHU Follow-Up Queue Injection] Result:", result);

        return NextResponse.json({ ...result, timestamp: new Date().toISOString() });
    } catch (error: any) {
        console.error("[Cron: RHU Follow-Up Queue Injection] Failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET endpoint for manual testing and verification (protected via query param ?secret=...)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && secret !== cronSecret) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        console.log("[Manual Trigger: RHU Follow-Up Queue Injection] Executing injection...");
        const result = await injectDailyFollowUpQueue();
        return NextResponse.json({ ...result, timestamp: new Date().toISOString() });
    } catch (error: any) {
        console.error("[Manual Trigger: RHU Follow-Up Queue Injection] Failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
