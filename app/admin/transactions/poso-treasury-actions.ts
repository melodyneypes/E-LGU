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

/**
 * Pre-compute POSO penalty charges on the server side so client views render instantly
 */
export async function preComputePosoTransactionPenalty(transaction: any) {
    try {
        const addData = (transaction.additionalData as any) || {};
        const fiscalSnap = (transaction.fiscalSnapshot as any) || {};
        const headerId = addData.ticketHeaderId || addData.ticketId;

        let apprehensionDate = addData.apprehensionDate || transaction.createdAt;
        let ticketHeaderObj: any = null;

        if (headerId) {
            ticketHeaderObj = await prisma.ticketHeader.findUnique({
                where: { id: headerId },
            });
            if (ticketHeaderObj?.dateTime) {
                apprehensionDate = ticketHeaderObj.dateTime;
            }
        }

        const { getPosoPenaltySettings, calculatePosoTicketPenalty } = await import("@/app/admin/poso/actions");
        const settingsRes = await getPosoPenaltySettings();
        const settings = settingsRes.settings || { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 };

        const baseFine = fiscalSnap.baseFineTotal ?? (ticketHeaderObj?.totalAmount || transaction.totalAmount || 0);
        const impoundFee = fiscalSnap.impoundFee ?? Number(ticketHeaderObj?.impoundFee || addData.impoundFee || 0);

        const penaltyBreakdown = await calculatePosoTicketPenalty(
            {
                totalAmount: baseFine,
                impoundFee: impoundFee,
                isImpounded: Boolean(impoundFee > 0 || ticketHeaderObj?.isImpounded || addData.isImpounded),
                dateTime: apprehensionDate,
                isPaid: transaction.isPaid || transaction.status === "PAID" || transaction.status === "SETTLED" || transaction.status === "RELEASED",
                status: transaction.status,
            },
            settings
        );

        const surchargeAmount = penaltyBreakdown.surchargeAmount;
        const interestAmount = penaltyBreakdown.interestAmount;
        const grandTotal = penaltyBreakdown.grandTotalPayable;

        const updatedFiscalSnapshot = {
            ...fiscalSnap,
            baseFineTotal: baseFine,
            impoundFee: impoundFee,
            surchargeAmount,
            interestAmount,
            totalPenalty: penaltyBreakdown.totalPenalty,
            totalAmount: grandTotal,
        };

        const updatedAdditionalData = {
            ...addData,
            penaltyBreakdown,
        };

        return {
            ...transaction,
            totalAmount: grandTotal,
            fiscalSnapshot: updatedFiscalSnapshot,
            additionalData: updatedAdditionalData,
        };
    } catch (posoErr) {
        console.error("Failed to pre-compute POSO penalty on server:", posoErr);
        return transaction;
    }
}

