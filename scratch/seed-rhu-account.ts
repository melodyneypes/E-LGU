import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding RHU Admin Account...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const rhuAdmin = await prisma.user.upsert({
        where: { email: "rhu@mapandan.gov.ph" },
        update: {
            name: "RHU Administrator",
            role: "ADMIN",
            department: "RHU",
            password: hashedPassword,
            isEmailVerified: true,
            emailVerified: new Date(),
        },
        create: {
            name: "RHU Administrator",
            email: "rhu@mapandan.gov.ph",
            password: hashedPassword,
            role: "ADMIN",
            department: "RHU",
            isEmailVerified: true,
            emailVerified: new Date(),
        }
    });

    console.log("✅ RHU Admin Account created successfully:");
    console.log("-----------------------------------------");
    console.log(`Email:       ${rhuAdmin.email}`);
    console.log(`Password:    password123`);
    console.log(`Role:        ${rhuAdmin.role}`);
    console.log(`Department:  ${rhuAdmin.department}`);
    console.log("-----------------------------------------");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding RHU admin account:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
