const { PrismaClient } = require('c:/Users/User/Documents/GitHub/EMapandan/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testCount() {
    const roRes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count 
        FROM "EquipmentRequestOrder" 
        WHERE UPPER("status") IN ('SUBMITTED', 'PENDING', 'PENDING_APPROVAL')
    `);
    const ticketRes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count 
        FROM "EquipmentStockReturnTicket" 
        WHERE UPPER("status") IN ('OPEN_INVESTIGATION', 'PENDING', 'OPEN')
    `);
    console.log("RO count:", roRes[0].count);
    console.log("Ticket count:", ticketRes[0].count);
    console.log("Total RHU Admin notification count:", Number(roRes[0].count) + Number(ticketRes[0].count));
}

testCount().finally(() => prisma.$disconnect());
