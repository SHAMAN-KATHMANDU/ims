/**
 * Essential-only seed entrypoint invoked from docker-entrypoint.sh after
 * `prisma migrate deploy`. Idempotent: re-running converges platform data
 * to the desired state, so it's safe to run on every container boot.
 *
 * Pairs with `seed-essential.js` (ts-node shim) — see prisma/seed.js for the
 * same pattern used by the full seed.
 *
 * Required env:
 *   SEED_PLATFORM_ADMIN_PASSWORD  — bootstraps the platform admin user
 * Optional env:
 *   SEED_PLATFORM_ADMIN_USERNAME  — defaults to "platform"
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import * as path from "path";
import { runEssentialSeeds } from "./seeds/essential/index";

// Mirror seeds/index.ts:42–43 so env vars from repo root or apps/api/.env load.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const startedAt = Date.now();
  console.log("🌱 Essential seed starting...");
  try {
    await runEssentialSeeds(prisma);
    console.log(`✅ Essential seed complete in ${Date.now() - startedAt}ms.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Essential seed failed:", e);
  process.exit(1);
});
