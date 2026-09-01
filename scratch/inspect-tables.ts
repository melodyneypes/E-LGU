import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking PostgreSQL tables in database...");
    const tables: any[] = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `;
    console.log("Tables list:");
    console.table(tables.map(t => t.table_name));
}

main()
    .catch(e => {
        console.error("Error inspecting tables:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
