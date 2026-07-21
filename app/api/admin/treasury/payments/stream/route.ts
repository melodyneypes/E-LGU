import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    // Authenticate the connection
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (!session || (userRole !== "ADMIN" && userRole !== "TREASURY_STAFF")) {
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
            // Keep connection alive with heartbeats
            const heartbeat = setInterval(() => {
                controller.enqueue("data: heartbeat\n\n");
            }, 30000);

            // Handler for db changes in Payment table using Supabase Realtime
            const channel = supabase
                .channel("reports-payments-ledger-stream")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Payment"
                    },
                    (payload: any) => {
                        console.log(`[SSE STREAM] Supabase detected Payment change: ${payload.eventType}`);
                        controller.enqueue("data: refresh\n\n");
                    }
                )
                .subscribe();

            // Handle clean closing
            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                supabase.removeChannel(channel);
                try {
                    controller.close();
                } catch {
                    // Stream might be closed already
                }
            });
        },
    });

    return new Response(stream, { headers: responseHeaders });
}
