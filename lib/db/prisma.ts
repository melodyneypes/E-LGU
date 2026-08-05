import { PrismaClient } from "@prisma/client";

function getFormattedDatabaseUrl() {
  const url = process.env.DATABASE_URL || "";
  if (!url) return undefined;
  
  let formatted = url;
  if (formatted.includes("connection_limit=")) {
    formatted = formatted
      .replace(/connection_limit=\d+/, "connection_limit=10")
      .replace(/pool_timeout=\d+/, "pool_timeout=15");
  } else {
    const separator = formatted.includes("?") ? "&" : "?";
    formatted = `${formatted}${separator}connection_limit=10&pool_timeout=15`;
  }
  return formatted;
}

const prismaClientSingleton = () => {
  const formattedUrl = getFormattedDatabaseUrl();
  return new PrismaClient({
    log: ["error", "warn"],
    ...(formattedUrl ? { datasources: { db: { url: formattedUrl } } } : {})
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
