import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDept = (session?.user as any)?.department;
    const allowedRoles = ["ADMIN"];
    
    if (!session || (!allowedRoles.includes(userRole) && userDept !== "POSO")) {
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
                try {
                    controller.enqueue("data: heartbeat\n\n");
                } catch {
                    clearInterval(heartbeat);
                }
            }, 30000);

            // Realtime PostgreSQL changes listener on Payment, Transaction and TicketHeader tables
            const channel = supabase
                .channel("poso-payment-ledger-stream")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Payment" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Transaction" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "TicketHeader" },
                    () => controller.enqueue("data: refresh\n\n")
                )
                .subscribe();

            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                supabase.removeChannel(channel);
            });
        },
    });

    return new Response(stream, { headers: responseHeaders });
}
