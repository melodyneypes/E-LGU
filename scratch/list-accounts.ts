import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            role: {
                in: [
                    "ADMIN",
                    "ENGINEER",
                    "MPDC_ZONING",
                    "BFP",
                    "TREASURY_STAFF",
                    "ADMIN_AIDE",
                    "USER"
                ]
            }
        },
        select: {
            name: true,
            email: true,
            role: true,
            department: true,
        },
        orderBy: { role: 'asc' }
    });

    console.log("=== KEY DEPARTMENT ACCOUNTS ===");
    console.table(users);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
