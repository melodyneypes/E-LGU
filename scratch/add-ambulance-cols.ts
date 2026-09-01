import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Adding missing columns to RHUAmbulance table...");

    await prisma.$executeRawUnsafe(`
        ALTER TABLE "RHUAmbulance" 
        ADD COLUMN IF NOT EXISTS "assignedDriverId" text,
        ADD COLUMN IF NOT EXISTS "chassisNumber" text,
        ADD COLUMN IF NOT EXISTS "engineNumber" text,
        ADD COLUMN IF NOT EXISTS "orNumber" text,
        ADD COLUMN IF NOT EXISTS "crNumber" text,
        ADD COLUMN IF NOT EXISTS "registrationExpiry" timestamp(3),
        ADD COLUMN IF NOT EXISTS "insuranceExpiry" timestamp(3);
    `);

    console.log("✅ Columns added successfully to RHUAmbulance table.");
}

main()
    .catch(e => {
        console.error("Error adding columns:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
