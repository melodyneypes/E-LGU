"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

const ALLOWED_ROLES = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR", "ASSESSOR"];

async function verifyAuthUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
        return null;
    }
    return user;
}

function parseAdditionalData(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return raw;
}

// ----------------------------------------------------
// GENERAL / GENERIC CALLING ACTIONS
// ----------------------------------------------------

export async function callTicketToCounter(id: string, counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedId = sanitizeString(id);
        const sanitizedCounterName = sanitizeString(counterName);

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const finalStatuses = ["RELEASED", "CANCELLED", "REJECTED", "DELIVERED"];
        if (finalStatuses.includes(transaction.status)) {
            return { success: true, message: "Transaction already finalized" };
        }

        const currentAdditionalData = parseAdditionalData(transaction.additionalData);
        const isAssessor = user.role === "ASSESSOR" || user.department?.toUpperCase() === "ASSESSOR";
        const isTreasury = user.role === "TREASURY_STAFF" || user.department?.toUpperCase() === "TREASURY";
        const servingDept = isAssessor ? "Assessor" : isTreasury ? "Treasury" : "BPLO";

        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: servingDept
        };

        const updated = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/assessor");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call ticket to counter:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// TREASURY DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextTicket(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedCounterName = sanitizeString(counterName);

        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { processorRole: "TREASURY_STAFF", category: "CEDULA" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { type: { code: "RPT_CAT1" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { status: "UNPAID" }
                ],
                isCancelled: false,
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: "No tickets currently waiting for Treasury." };
        }

        const sorted = transactions.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aCheckedIn = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "Treasury"
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next Treasury ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// BPLO DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextBploTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch all matching queue tickets for BPLO (Business Permits)
        const transactions = await prisma.transaction.findMany({
            where: {
                type: {
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                status: {
                    in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM"]
                },
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // Filter: Checked in AND not yet assigned to any counter
        const unassignedWaiting = transactions.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassignedWaiting.length === 0) {
            return { success: false, error: "No commercial applicants are currently waiting in line." };
        }

        // Sort: Priority (isPriority === true) first in FIFO order (checkedInAt ASC), then Standard FIFO
        const sorted = unassignedWaiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];

        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "BPLO"
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/bplo");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next BPLO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function getBploQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch all matching queue tickets for BPLO
        const allBploTxs = await prisma.transaction.findMany({
            where: {
                type: {
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                status: {
                    in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM"]
                },
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                businessPermit: true
            }
        });

        // Filter waiting tickets: checkedIn === true AND no counter assigned yet
        const waiting = allBploTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        // Filter serving tickets: counterName matches active counter
        const serving = allBploTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return {
            success: true,
            data: {
                waiting: sortedWaiting,
                serving: serving
            }
        };
    } catch (error) {
        console.error("Failed to fetch BPLO queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function callSpecificBploTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id: ticketId }
        });

        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = parseAdditionalData(tx.additionalData);
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "BPLO"
        };

        const updated = await prisma.transaction.update({
            where: { id: ticketId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/bplo");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call specific BPLO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}
