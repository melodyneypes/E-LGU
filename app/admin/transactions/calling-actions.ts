"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

export async function callTicketToCounter(id: string, counterName: string) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) {
            return { success: false, error: "Transaction not found" };
        }

        // Avoid changing status if the transaction is already finalized
        const finalStatuses = ["RELEASED", "CANCELLED", "REJECTED", "DELIVERED"];
        if (finalStatuses.includes(transaction.status)) {
            return { success: true, message: "Transaction already finalized" };
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName
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
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call ticket to counter:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch all matching queue tickets waiting for Treasury
        const transactions = await prisma.transaction.findMany({
            where: {
                type: {
                    processorRole: "TREASURY_STAFF"
                },
                status: {
                    in: ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"]
                },
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: "No citizens are currently waiting in line." };
        }

        // Sort: Priority (Seniors/PWDs) first, then by checkedInAt physical timestamp (FIFO)
        const sorted = transactions.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];

        // Call the next ticket using our existing function logic
        const currentAdditionalData = (nextTx.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName
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
        console.error("Failed to fetch and call next ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}
