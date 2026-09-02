import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    await prisma.user.deleteMany({ where: { email: "mdrrmo.staff@mapandan.gov.ph" } });
    await prisma.user.updateMany({ where: { role: "MDRRMO_STAFF" as any }, data: { role: "MDRRMO_ADMIN" as any } });
    console.log("Cleaned MDRRMO_STAFF from database successfully.");
}

main().finally(async () => {
    await prisma.$disconnect();
});
