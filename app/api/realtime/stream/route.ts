import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";

type Controller = ReadableStreamDefaultController<Uint8Array>;
const clients = new Set<Controller>();

/**
 * Broadcasts a realtime SSE event to all connected clients in memory.
 */
export function broadcastRealtimeUpdate(data: any = { type: "REFRESH" }) {
  const encoder = new TextEncoder();
  const payloadStr = typeof data === "string" ? data : JSON.stringify(data);
  const message = `data: ${payloadStr}\n\n`;
  const encoded = encoder.encode(message);

  for (const client of clients) {
    try {
      client.enqueue(encoded);
    } catch {
      clients.delete(client);
    }
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      clients.add(controller);

      // Send initial connection notice
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`));

      let lastTxTimestamp: number | null = null;

      try {
        const latestTx = await prisma.transaction.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true }
        });
        if (latestTx?.updatedAt) {
          lastTxTimestamp = new Date(latestTx.updatedAt).getTime();
        }
      } catch {}

      // Server-side check every 2 seconds inside open HTTP stream
      const checkInterval = setInterval(async () => {
        try {
          const latest = await prisma.transaction.findFirst({
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, id: true, status: true, isCancelled: true }
          });

          if (latest?.updatedAt) {
            const ts = new Date(latest.updatedAt).getTime();
            if (lastTxTimestamp !== null && ts > lastTxTimestamp) {
              lastTxTimestamp = ts;
              const payload = `data: ${JSON.stringify({ type: "TRANSACTION_MUTATED", txId: latest.id, status: latest.status, isCancelled: latest.isCancelled })}\n\n`;
              controller.enqueue(encoder.encode(payload));
            } else {
              lastTxTimestamp = ts;
              // Ping heartbeat
              controller.enqueue(encoder.encode(`: ping\n\n`));
            }
          } else {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          // Keep stream alive
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(checkInterval);
            clients.delete(controller);
          }
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(checkInterval);
        clients.delete(controller);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel(controller) {
      clients.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({ type: "REFRESH" }));
    broadcastRealtimeUpdate(body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  }
}
