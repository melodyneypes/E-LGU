import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== USERS IN DATABASE ===");
    const users = await prisma.user.findMany({
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            isEmailVerified: true,
            isPasswordChanged: true,
            rejectionCount: true,
            updatedAt: true,
            residentProfile: {
                select: {
                    id: true,
                    registrationStatus: true,
                    isDead: true
                }
            }
        }
    });

    console.table(users.map(u => ({
        id: u.id.slice(0, 8),
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        verified: u.isEmailVerified,
        pwChanged: u.isPasswordChanged,
        rejCount: u.rejectionCount,
        regStatus: u.residentProfile?.registrationStatus,
        isDead: u.residentProfile?.isDead
    })));

    console.log("=== RATE LIMITS ===");
    const rateLimits = await prisma.rateLimit.findMany();
    console.log("Rate limits count:", rateLimits.length);
    console.table(rateLimits);
}

main().finally(async () => {
    await prisma.$disconnect();
});
