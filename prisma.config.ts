import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const isDevelopment = (process.env.NODE_ENV || "").toLowerCase() === "development";
const primaryEnvFile = isDevelopment ? ".env.development" : ".env";
const fallbackEnvFile = ".env";

const primaryPath = path.resolve(process.cwd(), primaryEnvFile);
const fallbackPath = path.resolve(process.cwd(), fallbackEnvFile);

if (existsSync(primaryPath)) {
  config({ path: primaryPath, override: true });
} else if (existsSync(fallbackPath)) {
  config({ path: fallbackPath, override: true });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Prisma config.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
