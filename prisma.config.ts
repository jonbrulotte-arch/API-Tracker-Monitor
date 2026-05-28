import { defineConfig } from "prisma/config";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually — no dotenv dependency needed
try {
  const envPath = resolve(process.cwd(), ".env");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // .env not present — rely on environment variables already set
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./dev.db",
  },
});
