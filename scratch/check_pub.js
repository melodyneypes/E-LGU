const { PrismaClient } = require('c:/Users/User/Documents/GitHub/EMapandan/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkPublication() {
    try {
        const pubTables = await prisma.$queryRawUnsafe(`
            SELECT schemaname, tablename 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime';
        `);
        console.log("=== supabase_realtime publication tables ===");
        console.log(pubTables);
    } catch (e) {
        console.error("Error checking publication:", e);
    }
}

checkPublication().finally(() => prisma.$disconnect());
