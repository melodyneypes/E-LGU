import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== MedicalAsset DEFAULTS ===");
    const cols: any[] = await prisma.$queryRaw`
        SELECT column_name, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'MedicalAsset' AND column_name IN ('quantity', 'availableQty');
    `;
    console.table(cols);
}

main().finally(async () => {
    await prisma.$disconnect();
});
