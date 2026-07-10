import { NextResponse } from "next/server";
import { getActiveQueueData } from "@/app/queue/actions";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const data = await getActiveQueueData();
        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        });
    } catch (error: any) {
        console.error("Queue API fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch queue data" }, { status: 500 });
    }
}
