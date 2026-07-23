"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function confirmPosoTrafficFinePayment({
    transactionId,
    orNumber,
    paymentMethod = "CASH",
    paymentReference,
    remarks,
}: {
    transactionId: string;
    orNumber: string;
    paymentMethod?: string;
    paymentReference?: string;
    remarks?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Unauthorized. Only Treasury Staff or Admins can collect payment." };
        }

        if (!orNumber || !orNumber.trim()) {
            return { success: false, error: "Official Receipt (O.R.) Number is required." };
        }

        if (paymentMethod !== "CASH" && (!paymentReference || !paymentReference.trim())) {
            return { success: false, error: `${paymentMethod} Transaction Reference Number is required.` };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            return { success: false, error: "Transaction record not found." };
        }

        if (transaction.status === "PAID" || transaction.isPaid) {
            return { success: false, error: "Transaction is already paid and settled." };
        }

        const additional = (transaction.additionalData as any) || {};
        const ticketHeaderId = additional.ticketHeaderId;

        // Execute DB updates inside a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update Transaction status and O.R. Reference
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: "PAID",
                    isPaid: true,
                    paymentType: paymentMethod as any,
                    paymentReference: paymentMethod === "CASH" ? orNumber.trim() : paymentReference?.trim(),
                    processedBy: user.name || user.email,
                    additionalData: {
                        ...additional,
                        orNumber: orNumber.trim(),
                        paymentMethod,
                        paymentReference: paymentReference?.trim() || null,
                        paidAt: new Date().toISOString(),
                        processedByStaff: user.name || user.email,
                        cashierRemarks: remarks || "POSO Traffic Fine Paid at Treasury",
                    },
                },
            });

            // 2. Update TicketHeader status to SETTLED
            if (ticketHeaderId) {
                await tx.ticketHeader.update({
                    where: { id: ticketHeaderId },
                    data: {
                        status: "SETTLED",
                        isPaid: true,
                        transactionId: transactionId,
                    },
                });
            }
        });

        revalidatePath(`/admin/treasury/${transactionId}`);
        revalidatePath("/admin/treasury/payments");
        revalidatePath("/admin/poso/tickets");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to confirm POSO traffic fine payment:", error);
        return { success: false, error: error.message || "Failed to process payment." };
    }
}
