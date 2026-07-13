const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'bfp@admin.com';
    const password = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: 'Municipal BFP',
            password,
            role: 'BFP',
            isEmailVerified: true
        },
        create: {
            email,
            name: 'Municipal BFP',
            password,
            role: 'BFP',
            isEmailVerified: true
        }
    });
    console.log('BFP user created:', user);
}

main()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
