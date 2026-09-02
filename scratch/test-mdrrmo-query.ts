import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("🧪 Testing MDRRMO Prisma queries...");

    const [fleet, drivers, documents, schedules, hotlines] = await Promise.all([
        prisma.rHUAmbulance.findMany({ include: { drivers: true, documents: true, schedules: true } }),
        prisma.ambulanceDriver.findMany({ include: { assignedAmbulance: true } }),
        prisma.ambulanceDocument.findMany({ include: { ambulance: true } }),
        prisma.ambulanceDispatchSchedule.findMany({ include: { ambulance: true, driver: true } }),
        prisma.rHUAmbulanceHotline.findMany()
    ]);

    console.log("✅ All queries succeeded:");
    console.log(`- Fleet count:     ${fleet.length}`);
    console.log(`- Drivers count:   ${drivers.length}`);
    console.log(`- Documents count: ${documents.length}`);
    console.log(`- Schedules count: ${schedules.length}`);
    console.log(`- Hotlines count:  ${hotlines.length}`);
}

main()
    .catch(e => {
        console.error("Query test error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
