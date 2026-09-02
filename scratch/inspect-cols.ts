import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== RHUAmbulance COLUMNS IN POSTGRES ===");
    const cols: any[] = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'RHUAmbulance';
    `;
    console.table(cols);
}

main().finally(async () => {
    await prisma.$disconnect();
});
