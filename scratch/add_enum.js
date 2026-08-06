const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring Supabase Realtime publication is enabled for Transaction table...');
  try {
    await prisma.$executeRawUnsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE "Transaction"`);
    console.log('Added "Transaction" table to supabase_realtime publication.');
  } catch (err) {
    console.log('Note on publication setup:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" REPLICA IDENTITY FULL`);
    console.log('Set REPLICA IDENTITY FULL for "Transaction".');
  } catch (err) {
    console.log('Note on replica identity:', err.message);
  }
}

main()
  .catch((e) => {
    console.error('Error enabling realtime:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
