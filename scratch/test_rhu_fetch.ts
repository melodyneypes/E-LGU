import prisma from "../lib/db/prisma";

async function testRHUFetch() {
  console.log("=== Testing raw query ===");
  const rawTxs: any[] = await prisma.$queryRaw`
    SELECT t.*, tt.name as type_name, tt.category as type_category
    FROM "Transaction" t
    JOIN "TransactionType" tt ON t."typeId" = tt."id"
    WHERE tt."category" IN ('RHU', 'Rural Health Unit', 'Rural Health Unit (RHU)', 'HEALTH', 'RURAL_HEALTH_UNIT')
    ORDER BY t."createdAt" DESC
  `;
  console.log(`Found ${rawTxs.length} RHU transactions!`);
  console.log(rawTxs.map(t => ({ id: t.id, controlNumber: t.controlNumber, typeName: t.type_name, status: t.status })));
}

testRHUFetch().catch(console.error);
