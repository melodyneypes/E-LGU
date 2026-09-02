import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding MDRRMO Admin Account...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const mdrrmoAdmin = await prisma.user.upsert({
        where: { email: "mdrrmo@mapandan.gov.ph" },
        update: {
            name: "MDRRMO Administrator",
            role: "MDRRMO_ADMIN" as any,
            department: "MDRRMO",
            password: hashedPassword,
            isEmailVerified: true,
            emailVerified: new Date(),
        },
        create: {
            name: "MDRRMO Administrator",
            email: "mdrrmo@mapandan.gov.ph",
            password: hashedPassword,
            role: "MDRRMO_ADMIN" as any,
            department: "MDRRMO",
            isEmailVerified: true,
            emailVerified: new Date(),
        }
    });

    console.log("✅ MDRRMO Account ready:");
    console.log("=========================================");
    console.log(`Email:       ${mdrrmoAdmin.email}`);
    console.log(`Password:    password123`);
    console.log(`Role:        ${mdrrmoAdmin.role}`);
    console.log(`Department:  ${mdrrmoAdmin.department}`);
    console.log("=========================================");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding MDRRMO account:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
