const { PrismaClient } = require('c:/Users/User/Documents/GitHub/EMapandan/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { email: 'rhu@mapandan.gov.ph' }
    });
    console.log("RHU Admin user record:", user);
}

checkUser().finally(() => prisma.$disconnect());
