import prisma from "@/lib/db/prisma";

interface GenerateQueueParams {
  source: "web" | "kiosk";
  isPriority: boolean;
  appointmentDate: Date;
}

/**
 * Generates a shared format queue ticket number.
 * Formats:
 * - A-XXXXX (Web, standard)
 * - B-XXXXX (Kiosk, standard)
 * - A1-XXXXX (Web, priority - Seniors, PWDs)
 * - B1-XXXXX (Kiosk, priority - Seniors, PWDs)
 * 
 * Auto-increments sequentially regardless of the service selected.
 */
export async function generateQueueNumber({
  source,
  isPriority,
  appointmentDate,
}: GenerateQueueParams): Promise<string> {
  const prefix = source === "web"
    ? (isPriority ? "A1" : "A")
    : (isPriority ? "B1" : "B");

  const startOfDay = new Date(appointmentDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(appointmentDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Count how many transactions have already been generated for this prefix on this date
  const count = await prisma.transaction.count({
    where: {
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isCancelled: false,
      queueNumber: {
        startsWith: `${prefix}-`,
      },
    },
  });

  const seqNum = String(count + 1).padStart(5, "0");
  return `${prefix}-${seqNum}`;
}
