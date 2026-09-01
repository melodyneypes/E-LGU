import prisma from "../lib/db/prisma";

async function main() {
    try {
        const count: any[] = await prisma.$queryRaw`SELECT count(*) FROM "MedicalAsset"`;
        console.log("Total Medical Assets in DB:", count[0]);

        const sampleCount: any[] = await prisma.$queryRaw`SELECT count(*) FROM "MedicalAsset" WHERE "equipmentName" ILIKE '%sample%' OR "equipmentName" = 'asdf'`;
        console.log("Sample / Test Asset rows:", sampleCount[0]);

        const realAssets: any[] = await prisma.$queryRaw`SELECT id, "assetTagNo", "equipmentName", "currentFacility" FROM "MedicalAsset" WHERE "equipmentName" NOT ILIKE '%sample%' AND "equipmentName" != 'asdf' LIMIT 20`;
        console.log("Legitimate Assets:", realAssets);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
