import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const deleted = await prisma.rateLimit.deleteMany();
    console.log("Deleted rate limit records:", deleted);
}

main()
    .catch((err) => console.error(err))
    .finally(() => prisma.$disconnect());
