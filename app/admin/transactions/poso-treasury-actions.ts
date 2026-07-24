"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TicketStatus, PaymentType, PaymentStatus, TransactionStatus } from "@prisma/client";

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
        let ticketHeaderIds: string[] = Array.isArray(additional.ticketHeaderIds)
            ? additional.ticketHeaderIds
            : additional.ticketHeaderId
            ? [additional.ticketHeaderId]
            : [];

        if (ticketHeaderIds.length === 0 && Array.isArray(additional.ticketsBreakdown)) {
            ticketHeaderIds = additional.ticketsBreakdown.map((tb: any) => tb.ticketId).filter(Boolean);
        }

        // Map input paymentMethod string to Prisma PaymentType enum
        let mappedPaymentType: PaymentType = PaymentType.CASH;
        if (paymentMethod === "GCASH" || paymentMethod === "LANDBANK" || paymentMethod === "E_PAYMENT") {
            mappedPaymentType = PaymentType.E_PAYMENT;
        } else if (paymentMethod === "BANK_TRANSFER") {
            mappedPaymentType = PaymentType.BANK_TRANSFER;
        }

        const cleanReference = paymentMethod === "CASH" ? null : (paymentReference?.trim() || null);

        // Execute DB updates inside an atomic transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update Transaction status and O.R. Reference
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.PAID,
                    isPaid: true,
                    paymentType: mappedPaymentType,
                    paymentReference: cleanReference,
                    processedBy: user.name || user.email,
                    additionalData: {
                        ...additional,
                        orNumber: orNumber.trim(),
                        paymentMethod,
                        paymentReference: cleanReference,
                        paidAt: new Date().toISOString(),
                        processedByStaff: user.name || user.email,
                        cashierRemarks: remarks || "POSO Traffic Fine Paid at Treasury",
                    },
                },
            });

            // 2. Atomically update ALL associated TicketHeader statuses to PAID
            const ticketOrConditions: any[] = [];
            if (ticketHeaderIds.length > 0) {
                ticketOrConditions.push({ id: { in: ticketHeaderIds } });
            }
            ticketOrConditions.push({ transactionId: transactionId });
            if (additional.ticketNo) {
                ticketOrConditions.push({ ticketNo: additional.ticketNo });
            }
            if (Array.isArray(additional.ticketNumbers) && additional.ticketNumbers.length > 0) {
                ticketOrConditions.push({ ticketNo: { in: additional.ticketNumbers } });
            }

            await tx.ticketHeader.updateMany({
                where: {
                    OR: ticketOrConditions,
                },
                data: {
                    status: TicketStatus.PAID,
                    isPaid: true,
                    transactionId: transactionId,
                },
            });

            // 3. Upsert Payment table record
            await tx.payment.upsert({
                where: { transactionId },
                create: {
                    transactionId,
                    amount: transaction.totalAmount || 0,
                    method: mappedPaymentType,
                    status: PaymentStatus.PAID,
                    reference: cleanReference,
                    orNumber: orNumber.trim(),
                    meta: {
                        settledBy: user.name || user.email,
                        paymentMethod,
                        remarks: remarks || "POSO Traffic Fine Settlement",
                    },
                },
                update: {
                    amount: transaction.totalAmount || 0,
                    method: mappedPaymentType,
                    status: PaymentStatus.PAID,
                    reference: cleanReference,
                    orNumber: orNumber.trim(),
                    meta: {
                        settledBy: user.name || user.email,
                        paymentMethod,
                        remarks: remarks || "POSO Traffic Fine Settlement",
                    },
                },
            });
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
