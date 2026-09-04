/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.transaction.findUnique({
        where: { id: "cmtjicr2s0003v5yk534y62no" },
        include: { type: true }
    });

    console.log("Transaction:", {
        id: tx.id,
        status: tx.status,
        typeCode: tx.type?.code,
        category: tx.type?.category,
        queueNumber: tx.queueNumber,
        isCancelled: tx.isCancelled,
        appointmentDate: tx.appointmentDate,
        additionalData: tx.additionalData
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
