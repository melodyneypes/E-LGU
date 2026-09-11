const { PrismaClient } = require('c:/Users/User/Documents/GitHub/EMapandan/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function test() {
    const ros = await prisma.$queryRawUnsafe('SELECT id, "roNumber", status, "requestingFacility" FROM "EquipmentRequestOrder"');
    console.log('ROs:', ros);
    const sos = await prisma.$queryRawUnsafe('SELECT id, "soNumber", status, "targetFacility" FROM "EquipmentStockTransfer"');
    console.log('SOs:', sos);
    const tickets = await prisma.$queryRawUnsafe('SELECT id, status, "bhsFacility" FROM "EquipmentStockReturnTicket"');
    console.log('Tickets:', tickets);
}
test().catch(console.error).finally(() => prisma.$disconnect());
