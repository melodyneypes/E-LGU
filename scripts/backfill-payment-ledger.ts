import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POST_PAYMENT_STATUSES = [
  "PAID",
  "FOR_PROCESSING",
  "FOR_CLAIM",
  "FOR_PICKING",
  "IN_ROUTE",
  "RELEASED",
  "DELIVERED",
] as const;

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: {
      status: { in: [...POST_PAYMENT_STATUSES] },
      payment: null,
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      paymentType: true,
      paymentReference: true,
      orUrl: true,
      additionalData: true,
      updatedAt: true,
    },
  });

  const eligible = transactions.filter((transaction) => {
    const additional = (transaction.additionalData as Record<string, unknown>) || {};
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

  const result = await prisma.payment.createMany({
    data: eligible.map((transaction) => {
      const additional = (transaction.additionalData as Record<string, unknown>) || {};
      const reference =
        additional.gcashReferenceNo ||
        additional.referenceNo ||
        additional.paymentReference ||
        transaction.paymentReference ||
        additional.orSeriesNumber ||
        transaction.orUrl ||
        `historical_${transaction.id}`;

      return {
        transactionId: transaction.id,
        amount: Number(transaction.totalAmount || 0),
        method: transaction.paymentType || "CASH",
        status: "PAID" as const,
        reference: String(reference),
        meta: {
          source: "historical_payment_backfill",
          originalTransactionStatus: transaction.status,
          backfilledAt: new Date().toISOString(),
          transactionUpdatedAt: transaction.updatedAt.toISOString(),
        },
      };
    }),
    skipDuplicates: true,
  });

  console.log(JSON.stringify({
    candidates: transactions.length,
    withPaymentEvidence: eligible.length,
    paymentsCreated: result.count,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
