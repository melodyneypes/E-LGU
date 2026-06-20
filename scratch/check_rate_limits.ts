import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.rateLimit.findMany();
    console.log("\n=== ACTIVE RATE LIMIT RECORDS ===");
    if (records.length === 0) {
        console.log("No active rate limit records found (database is empty/clean).");
    } else {
        records.forEach((r, i) => {
            const timeRemaining = Math.max(0, Math.ceil((r.expiresAt.getTime() - Date.now()) / 1000));
            console.log(`[${i + 1}] Key: ${r.key}`);
            console.log(`    Attempts: ${r.attempts}`);
            console.log(`    Expires In: ${timeRemaining}s (${r.expiresAt.toLocaleTimeString()})`);
            console.log("-----------------------------------------");
        });
    }
}

main()
    .catch((err) => console.error(err))
    .finally(() => prisma.$disconnect());
