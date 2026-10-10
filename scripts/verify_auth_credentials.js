const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const emails = [
    'barangay@lgu.gov.ph',
    'captain@lgu.gov.ph',
    'admin.apaya@lgu.gov.ph',
    'nilombot@lgu.gov.ph',
    'mdrrmo@lgu.gov.ph',
    'zoning@lgu.gov.ph',
    'bfp@lgu.gov.ph'
  ];

  console.log("Checking login verification for all key accounts...");
  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    if (!user) {
      console.log(`❌ User NOT found: ${email}`);
      continue;
    }
    const match = user.password ? await bcrypt.compare('password123', user.password) : false;
    console.log(`✅ User: ${user.email} | Role: ${user.role} | ManagedBrgy: ${user.managedBarangay} | PassMatchesPassword123: ${match}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
