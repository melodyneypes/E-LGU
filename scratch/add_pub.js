const { PrismaClient } = require('c:/Users/User/Documents/GitHub/EMapandan/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function addPub() {
    try {
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentRequestOrder";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentStockTransfer";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentStockReturnTicket";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                END IF;
            END $$;
        `);
        console.log("Successfully added tables to supabase_realtime publication!");
        
        const pubTables = await prisma.$queryRawUnsafe(`
            SELECT tablename 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime';
        `);
        console.log("Current publication tables:", pubTables.map(t => t.tablename));
    } catch (e) {
        console.error("Error adding to publication:", e);
    }
}

addPub().finally(() => prisma.$disconnect());
