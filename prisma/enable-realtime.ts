import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Configuring safe column-level RLS policy for anon role...");
    try {
        // 1. Grant SELECT privilege only on id, status, and updatedAt to anon role
        await prisma.$executeRawUnsafe(`
            GRANT SELECT (id, status, "updatedAt") ON "Transaction" TO anon;
        `);
        console.log("Successfully granted column-level SELECT to anon.");
    } catch (err: any) {
        console.error("Column privilege notice/error:", err.message);
    }

    try {
        // 2. Create RLS policy allowing SELECT to anon
        await prisma.$executeRawUnsafe(`
            CREATE POLICY "Allow anon select minimal" ON "Transaction"
            FOR SELECT TO anon
            USING (true);
        `);
        console.log("Successfully created 'Allow anon select minimal' policy.");
    } catch (err: any) {
        if (err.message.includes("already exists")) {
            console.log("Policy 'Allow anon select minimal' already exists.");
        } else {
            console.error("Policy creation notice/error:", err.message);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
