import prisma from "../lib/db/prisma";

async function main() {
    try {
        // Delete the 14,120 bloated test rows from the test PO
        const deleted = await prisma.$executeRaw`DELETE FROM "MedicalAsset" WHERE "equipmentName" ILIKE '%sample%' OR "equipmentName" = 'asdf'`;
        console.log("Deleted bloated sample test rows:", deleted);

        // Reset the test purchase orders if needed
        await prisma.$executeRaw`UPDATE "EquipmentPurchaseOrder" SET status = 'PENDING' WHERE "vendorName" ILIKE '%sample%'`;

        const remaining: any[] = await prisma.$queryRaw`SELECT count(*) FROM "MedicalAsset"`;
        console.log("Remaining clean medical assets:", remaining[0]);
    } catch (e: any) {
        console.error("Cleanup Error:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
