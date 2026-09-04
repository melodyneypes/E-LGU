/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.transaction.findUnique({
        where: { id: "cmtjicr2s0003v5yk534y62no" }
    });
    console.log("Queue Number:", tx?.queueNumber);
    console.log("Status:", tx?.status);
    console.log("Additional Data:", JSON.stringify(tx?.additionalData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
