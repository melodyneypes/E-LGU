import { PrismaClient } from "@prisma/client";

function getFormattedDatabaseUrl() {
  const url = process.env.DATABASE_URL || "";
  if (!url) return undefined;
  
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("connection_limit", "15");
    parsedUrl.searchParams.set("pool_timeout", "30");
    parsedUrl.searchParams.set("connect_timeout", "15");
    return parsedUrl.toString();
  } catch (error) {
    console.error("Error formatting database URL:", error);
    return url;
  }
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
