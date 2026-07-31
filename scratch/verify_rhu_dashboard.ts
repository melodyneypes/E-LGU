import prisma from "../lib/db/prisma";

async function verifyRHUDashboard() {
  const baseWhere = {
    type: {
      category: {
        in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"]
      }
    }
  };

  const [total, txs] = await Promise.all([
    prisma.transaction.count({ where: baseWhere }),
    prisma.transaction.findMany({
      where: baseWhere,
      include: { type: true, user: true },
      take: 10
    })
  ]);

  console.log(`=== RHU Dashboard Verification ===`);
  console.log(`Total Bookings Count: ${total}`);
  console.log(`Sample Transactions:`, txs.map(t => ({
    id: t.id,
    controlNumber: (t as any).controlNumber,
    status: t.status,
    category: t.type?.category,
    typeName: t.type?.name
  })));
}

verifyRHUDashboard().catch(console.error);
