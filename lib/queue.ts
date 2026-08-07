import prisma from "@/lib/db/prisma";

interface GenerateQueueParams {
  source: "web" | "kiosk";
  isPriority: boolean;
  appointmentDate: Date;
  appointmentSlot?: string;
  category?: "CEDULA" | "BUSINESS_PERMIT" | "CIVIL_REGISTRY" | "RHU" | "RPT_TREASURY" | "RPT_ASSESSOR";
}

/**
 * Generates a shared format queue ticket number.
 * Format: [DATE]-[SHIFT]-[PREFIX][SEQUENCE]
 * E.g., 07072026-AM-T001 (Cedula Standard)
 * E.g., 07072026-AM-TR001 (RPT Treasury Routine)
 * E.g., 07072026-AM-A001 (RPT Assessor Inspection/Transfer)
 * 
 * Auto-increments sequentially regardless of the service selected.
 */
export async function generateQueueNumber({
  isPriority,
  appointmentDate,
  appointmentSlot,
  category,
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
    ? (appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM") || appointmentSlot.toUpperCase() === "MORNING")
    : true;
  const shiftStr = isAM ? "AM" : "PM";

  // Count existing transactions for this shift on target date
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

  let prefix = "";
  if (category === "CEDULA" || category === "RPT_TREASURY") {
    prefix = isPriority ? "TP" : "T";
  } else if (category === "CIVIL_REGISTRY") {
    prefix = isPriority ? "RP" : "R";
  } else if (category === "BUSINESS_PERMIT") {
    prefix = isPriority ? "BP" : "B";
  } else if (category === "RHU") {
    prefix = isPriority ? "HP" : "H";
  } else if (category === "RPT_ASSESSOR") {
    prefix = isPriority ? "AP" : "A";
  } else {
    prefix = isPriority ? "P" : "";
  }

  const seqNum = String(shiftCount + 1).padStart(3, "0");
  return `${dateStr}-${shiftStr}-${prefix}${seqNum}`;
}
