import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Fixing verification, session state, and rate limits...");

    // 1. Clear all rate limits so nobody is locked out
    const deletedLimits = await prisma.rateLimit.deleteMany();
    console.log(`✅ Cleared ${deletedLimits.count} rate limit and OTP lock records.`);

    // 2. Ensure MDRRMO Admin account is completely verified and password setup is complete
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mdrrmo = await prisma.user.upsert({
        where: { email: "mdrrmo@mapandan.gov.ph" },
        update: {
            name: "MDRRMO Administrator",
            role: "MDRRMO_ADMIN" as any,
            department: "MDRRMO",
            password: hashedPassword,
            isEmailVerified: true,
            emailVerified: new Date(),
            isPasswordChanged: true, // Bypass OTP password setup requirement
            rejectionCount: 0
        },
        create: {
            name: "MDRRMO Administrator",
            email: "mdrrmo@mapandan.gov.ph",
            password: hashedPassword,
            role: "MDRRMO_ADMIN" as any,
            department: "MDRRMO",
            isEmailVerified: true,
            emailVerified: new Date(),
            isPasswordChanged: true,
            rejectionCount: 0
        }
    });

    console.log("✅ Verified MDRRMO Account status:");
    console.log(`   Email:             ${mdrrmo.email}`);
    console.log(`   Role:              ${mdrrmo.role}`);
    console.log(`   isEmailVerified:   ${mdrrmo.isEmailVerified}`);
    console.log(`   isPasswordChanged: ${mdrrmo.isPasswordChanged}`);

    // 3. Ensure other admin accounts have isPasswordChanged = true and isEmailVerified = true
    const updatedAdmins = await prisma.user.updateMany({
        where: {
            role: {
                in: [
                    "ADMIN",
                    "MDRRMO_ADMIN",
                    "ASSESSOR",
                    "RHU_ADMIN",
                    "RHU_CENTER_ADMIN",
                    "RHU_DOCTOR",
                    "RHU_STAFF",
                    "RHU_PHARMACY",
                    "TREASURY_STAFF",
                    "ADMIN_AIDE",
                    "CONTENT_ADMIN",
                    "BARANGAY_ADMIN",
                    "BARANGAY_CAPTAIN",
                    "MAYOR",
                    "ENGINEER",
                    "MPDC_ZONING",
                    "BFP"
                ]
            }
        },
        data: {
            isEmailVerified: true,
            isPasswordChanged: true,
            rejectionCount: 0
        }
    });
    console.log(`✅ Ensured ${updatedAdmins.count} admin/staff accounts have fully verified status.`);
}

main()
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
