import prisma from "../lib/db/prisma";

async function main() {
    try {
        const centers: any[] = await prisma.$queryRaw`SELECT id, name, code, barangay, status FROM "RHUHealthCenter" ORDER BY name ASC`;
        console.log("Registered RHU Health Centers:", centers);
    } catch (e: any) {
        console.error("Error querying RHUHealthCenter:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
