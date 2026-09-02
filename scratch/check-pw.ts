import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const engineer = await prisma.user.findUnique({ where: { email: "engineer@admin.com" } });
    const treasury = await prisma.user.findUnique({ where: { email: "treasury@mapandan.gov.ph" } });
    const admin = await prisma.user.findUnique({ where: { email: "admin@mapandan.gov.ph" } });

    const passwordsToTest = ["password123", "admin123", "password", "Password123!", "12345678", "Mapandan123!"];

    console.log("=== Testing Engineer Password ===");
    for (const p of passwordsToTest) {
        if (engineer?.password && await bcrypt.compare(p, engineer.password)) {
            console.log(`✅ Engineer (${engineer.email}) password is: "${p}"`);
        }
    }

    console.log("=== Testing Treasury Password ===");
    for (const p of passwordsToTest) {
        if (treasury?.password && await bcrypt.compare(p, treasury.password)) {
            console.log(`✅ Treasury (${treasury.email}) password is: "${p}"`);
        }
    }

    console.log("=== Testing Admin Password ===");
    for (const p of passwordsToTest) {
        if (admin?.password && await bcrypt.compare(p, admin.password)) {
            console.log(`✅ Admin (${admin.email}) password is: "${p}"`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
