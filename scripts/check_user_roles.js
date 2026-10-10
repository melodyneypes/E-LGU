const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Checking UserRole enum and Barangay users...");

  // Query raw enum values for UserRole
  try {
    const enumRes = await prisma.$queryRaw`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'UserRole'
    `;
    console.log("Database UserRole enum values:", enumRes.map(r => r.enumlabel));
  } catch (err) {
    console.error("Error fetching enum UserRole:", err.message);
  }

  // Check all users with barangay in email or role
  const barangayUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'barangay', mode: 'insensitive' } },
        { email: { contains: 'captain', mode: 'insensitive' } },
        { email: { contains: 'apaya', mode: 'insensitive' } },
        { managedBarangay: { not: null } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managedBarangay: true,
      isEmailVerified: true,
      password: true,
    }
  });

  console.log("Found Barangay users count:", barangayUsers.length);
  for (const u of barangayUsers) {
    const passwordMatches = u.password ? await bcrypt.compare('password123', u.password) : false;
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      managedBarangay: u.managedBarangay,
      isEmailVerified: u.isEmailVerified,
      passwordMatchesPassword123: passwordMatches
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
