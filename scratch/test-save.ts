import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Updating LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT defaultFees to custom array...");
    const updated = await prisma.transactionType.update({
        where: { code: "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT" },
        data: {
            baseFee: 130,
            defaultFees: [
                { code: "MANDATORY_FEE", label: "Mandatory Fee", amount: 230 },
                { code: "MISC_FEE", label: "Misc.", amount: 200 }
            ]
        }
    });
    console.log("Updated record defaultFees:", updated.defaultFees, typeof updated.defaultFees);

    const refetched = await prisma.transactionType.findUnique({
        where: { code: "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT" }
    });
    console.log("Refetched record defaultFees:", refetched?.defaultFees, typeof refetched?.defaultFees);
}

main().catch(console.error).finally(() => prisma.$disconnect());
