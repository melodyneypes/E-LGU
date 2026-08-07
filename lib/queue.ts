import prisma from "@/lib/db/prisma";

interface GenerateQueueParams {
  source: "web" | "kiosk";
  isPriority: boolean;
  appointmentDate: Date;
  appointmentSlot?: string;
  category?: "CEDULA" | "BUSINESS_PERMIT" | "CIVIL_REGISTRY" | "RHU" | "RPT_TREASURY" | "RPT_ASSESSOR";
}

/**
 * Generates an independent per-category queue ticket number.
 * Format: [DATE]-[SHIFT]-[PREFIX][SEQUENCE]
 * E.g., 08072026-AM-B001 (Business Permit Standard)
 * E.g., 08072026-AM-T001 (Cedula Standard)
 * E.g., 08072026-AM-H001 (RHU Standard)
 * E.g., 08072026-AM-BP001 (Business Permit Priority)
 * 
 * Auto-increments sequentially per category without overlapping.
 */
export async function generateQueueNumber({
  isPriority,
  appointmentDate,
  appointmentSlot,
  category,
}: GenerateQueueParams): Promise<string> {
  const targetDate = new Date(appointmentDate);

  const dateStr = targetDate.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).replace(/\//g, ""); // MMDDYYYY

  const isAM = appointmentSlot
    ? (appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM") || appointmentSlot.toUpperCase() === "MORNING")
    : true;
  const shiftStr = isAM ? "AM" : "PM";

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

  const prefixPattern = `${dateStr}-${shiftStr}-${prefix}`;

  // 1. Initial count of existing transactions matching this exact date, shift, and category prefix
  const categoryCount = await prisma.transaction.count({
    where: {
      queueNumber: {
        startsWith: prefixPattern
      },
      isCancelled: false,
    }
  });

  let sequence = categoryCount + 1;
  let candidateQueueNumber = `${prefixPattern}${String(sequence).padStart(3, "0")}`;
  let attempts = 0;
  const maxAttempts = 50;

  // 2. Collision resolution loop: if candidate queue number exists in DB, increment +1 until unique
  while (attempts < maxAttempts) {
    const existing = await prisma.transaction.findFirst({
      where: { queueNumber: candidateQueueNumber },
      select: { id: true }
    });

    if (!existing) {
      return candidateQueueNumber;
    }

    sequence++;
    candidateQueueNumber = `${prefixPattern}${String(sequence).padStart(3, "0")}`;
    attempts++;
  }

  return candidateQueueNumber;
}


