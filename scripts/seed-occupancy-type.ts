import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Occupancy Permit transaction type...");

    const occupancyType = await prisma.transactionType.upsert({
        where: { code: "OCCUPANCY_PERMIT" },
        update: {},
        create: {
            code: "OCCUPANCY_PERMIT",
            name: "Occupancy Permit",
            description: "Apply for a new occupancy permit online. Manage your building occupancy requirements.",
            category: "Occupancy",
            baseFee: 150.00,
            requiredDocs: [
                "Certificate of Completion",
                "As-Built Plans",
                "Fire Safety Inspection Certificate",
                "Logbook"
            ],
            isActive: true,
            level: 1,
            slaDays: 3
        }
    });

    console.log("✅ Successfully seeded Occupancy Permit transaction type:", occupancyType);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
