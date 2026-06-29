import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  // Prisma configuration options
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
