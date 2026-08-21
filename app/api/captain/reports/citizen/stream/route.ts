import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "BARANGAY_ADMIN" && userRole !== "ADMIN")) {
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

            const channel = supabase
                .channel("captain-reports-citizen-stream")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Report"
                    },
                    (payload: any) => {
                        console.log(`[CAPTAIN SSE STREAM] Supabase detected Report change: ${payload.eventType}`);
                        controller.enqueue("data: refresh\n\n");
                    }
                )
                .subscribe();

            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                supabase.removeChannel(channel);
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, { headers: responseHeaders });
}
