import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "TREASURY_STAFF", "STAFF"];
    if (!session || !allowedRoles.includes(userRole)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const responseHeaders = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
    };

    if (!supabase) {
        return new Response("Supabase client not initialized", { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const heartbeat = setInterval(() => {
                controller.enqueue("data: heartbeat\n\n");
            }, 30000);

            // Listen for changes across Report, Transaction, Payment, Resident
            const channel = supabase
                .channel("activity-logs-stream")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Report" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Transaction" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Payment" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Resident" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .subscribe();

            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                supabase.removeChannel(channel);
                try {
                    controller.close();
                } catch { /* closed */ }
            });
        },
    });

    return new Response(stream, { headers: responseHeaders });
}
