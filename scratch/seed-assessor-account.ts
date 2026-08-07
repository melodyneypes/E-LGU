import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Assessor Admin Account (assessor@admin.com)...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = await prisma.user.upsert({
        where: { email: "assessor@admin.com" },
        update: {
            password: hashedPassword,
            role: "ASSESSOR" as any,
            department: "ASSESSOR",
            isEmailVerified: true,
            emailVerified: new Date(),
            isPasswordChanged: true,
            name: "Municipal Assessor Admin"
        },
        create: {
            email: "assessor@admin.com",
            name: "Municipal Assessor Admin",
            password: hashedPassword,
            role: "ASSESSOR" as any,
            department: "ASSESSOR",
            isEmailVerified: true,
            emailVerified: new Date(),
            isPasswordChanged: true
        }
    });

    console.log("✅ Assessor Admin account created/updated successfully:", user.email, "Role:", user.role);
}

main()
    .catch((e) => {
        console.error("❌ Error seeding Assessor Admin account:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
