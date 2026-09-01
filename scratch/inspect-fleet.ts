import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== AMBULANCE FLEET IN DB ===");
    const ambulances = await prisma.rHUAmbulance.findMany({
        include: { drivers: true }
    });
    console.table(ambulances.map(a => ({
        id: a.id,
        unit: a.unit,
        plate: a.plateNumber,
        status: a.status,
        driversCount: a.drivers.length,
        drivers: a.drivers.map(d => d.name).join(", ")
    })));
}

main().finally(async () => {
    await prisma.$disconnect();
});
