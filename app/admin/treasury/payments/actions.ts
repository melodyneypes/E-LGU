"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPaymentsLedger(searchQuery: string = "") {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;

        if (role !== "TREASURY_STAFF" && role !== "ADMIN") {
            return { success: false, error: "Unauthorized" };
        }

        const paidTransactionsWithoutPayment = await prisma.transaction.findMany({
            where: {
                status: {
                    in: ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE", "RELEASED", "DELIVERED"]
                },
                payment: null
            },
            select: {
                id: true,
                totalAmount: true,
                paymentType: true,
                paymentReference: true,
                orUrl: true,
                additionalData: true,
                updatedAt: true
            }
        });

        if (paidTransactionsWithoutPayment.length > 0) {
            const transactionsWithPaymentEvidence = paidTransactionsWithoutPayment.filter((transaction) => {
                const additional = (transaction.additionalData as any) || {};
                return Boolean(
                    transaction.paymentReference ||
                    transaction.orUrl ||
                    additional.gcashReferenceNo ||
                    additional.referenceNo ||
                    additional.paymentReference ||
                    additional.paymentReferenceUrl ||
                    additional.paymentProofUrl ||
                    additional.treasuryReceiptUrl ||
                    additional.orSeriesNumber ||
                    additional.orDocumentUrl
                );
            });

            await prisma.payment.createMany({
                data: transactionsWithPaymentEvidence.map((transaction) => {
                    const additional = (transaction.additionalData as any) || {};
                    const reference =
                        additional.gcashReferenceNo ||
                        additional.referenceNo ||
                        additional.paymentReference ||
                        transaction.paymentReference ||
                        `manual_${transaction.id}`;

                    return {
                        transactionId: transaction.id,
                        amount: Number(transaction.totalAmount || 0),
                        method: transaction.paymentType || "CASH",
                        status: "PAID",
                        reference: String(reference),
                        meta: {
                            source: "paid_transaction_reconciliation",
                            reconciledAt: new Date().toISOString(),
                            transactionPaidAt: transaction.updatedAt.toISOString()
                        }
                    };
                }),
                skipDuplicates: true
            });
        }

        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { reference: { contains: searchQuery, mode: "insensitive" } },
                    { transactionId: { contains: searchQuery, mode: "insensitive" } },
                    { 
                        transaction: {
                            OR: [
                                { businessName: { contains: searchQuery, mode: "insensitive" } },
                                { 
                                    user: {
                                        name: { contains: searchQuery, mode: "insensitive" }
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            include: {
                transaction: {
                    include: {
                        type: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return { success: true, data: payments };
    } catch (error: any) {
        console.error("Failed to fetch payments ledger:", error);
        return { success: false, error: error.message || "Failed to fetch payments" };
    }
}
