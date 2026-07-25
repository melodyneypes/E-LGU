import prisma from "../lib/db/prisma";

async function checkRHUData() {
  console.log("=== TransactionTypes in DB ===");
  const types = await prisma.transactionType.findMany();
  console.log(types.map(t => ({ id: t.id, name: t.name, category: t.category })));

  console.log("\n=== Transactions in DB ===");
  const txs = await prisma.transaction.findMany({
    take: 20,
    include: { type: true }
  });
  console.log(txs.map(t => ({ id: t.id, typeName: t.type?.name, category: t.type?.category, status: t.status })));
}

checkRHUData().catch(console.error);
