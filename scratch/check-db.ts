import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const types = await prisma.transactionType.findMany({
        where: {
            OR: [
                { category: "Civil Registry" },
                { category: "CIVIL REGISTRY" },
                { code: { startsWith: "LCR_" } }
            ]
        },
        select: {
            id: true,
            code: true,
            name: true,
            category: true,
            baseFee: true,
            defaultFees: true
        }
    });
    console.log(JSON.stringify(types, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
