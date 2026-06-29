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

    console.log("Configuring Realtime publication and RLS permissions for TransactionType...");
    try {
        // Grant SELECT privilege on TransactionType to anon
        await prisma.$executeRawUnsafe(`
            GRANT SELECT ON "TransactionType" TO anon;
        `);
        console.log("Successfully granted SELECT on 'TransactionType' to anon.");
    } catch (err: any) {
        console.error("TransactionType grant error:", err.message);
    }

    try {
        // Create SELECT policy for anon on TransactionType (in case RLS is enabled)
        await prisma.$executeRawUnsafe(`
            CREATE POLICY "Allow anon select TransactionType" ON "TransactionType"
            FOR SELECT TO anon
            USING (true);
        `);
        console.log("Successfully created 'Allow anon select TransactionType' policy.");
    } catch (err: any) {
        if (err.message.includes("already exists")) {
            console.log("Policy 'Allow anon select TransactionType' already exists.");
        } else {
            console.error("Policy creation error:", err.message);
        }
    }

    try {
        // Add TransactionType to supabase_realtime publication
        await prisma.$executeRawUnsafe(`
            ALTER PUBLICATION supabase_realtime ADD TABLE "TransactionType";
        `);
        console.log("Successfully added 'TransactionType' to supabase_realtime publication.");
    } catch (err: any) {
        if (err.message.includes("already member of publication")) {
            console.log("'TransactionType' is already a member of publication 'supabase_realtime'.");
        } else {
            console.error("Publication alter error:", err.message);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
