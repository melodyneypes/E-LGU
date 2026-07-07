import prisma from "@/lib/db/prisma";

interface GenerateQueueParams {
  source: "web" | "kiosk";
  isPriority: boolean;
  appointmentDate: Date;
  appointmentSlot?: string;
}

/**
 * Generates a shared format queue ticket number.
 * Format: [DATE]-[SHIFT]-[PRIORITY_INDICATOR][SEQUENCE]
 * E.g., 07072026-AM-001 (Standard)
 * E.g., 07072026-AM-P001 (Priority)
 * 
 * Auto-increments sequentially regardless of the service selected.
 */
export async function generateQueueNumber({
  source,
  isPriority,
  appointmentDate,
  appointmentSlot,
}: GenerateQueueParams): Promise<string> {
  const startOfDay = new Date(appointmentDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(appointmentDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dateStr = startOfDay.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).replace(/\//g, ""); // MMDDYYYY

  const isAM = appointmentSlot
    ? (appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM"))
    : true;
  const shiftStr = isAM ? "AM" : "PM";

  // Count existing transactions for this shift on target date
  // using the direct isPriority column
  const shiftCount = await prisma.transaction.count({
    where: {
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      appointmentSlot: {
        contains: shiftStr
      },
      isCancelled: false,
      isPriority: isPriority,
    } as any
  });

  const seqNum = String(shiftCount + 1).padStart(3, "0");
  return `${dateStr}-${shiftStr}-${isPriority ? "P" : ""}${seqNum}`;
}
