/**
 * Integration test setup: run migrations, optional cleanup, disconnect.
 * Use with Vitest globalSetup or call in describe beforeAll/afterAll.
 *
 * For DB-backed integration tests, set DATABASE_URL to a test database
 * (e.g. postgresql://.../ims_test) so production data is not affected.
 */

import { execSync } from "child_process";
import path from "path";
import { basePrisma } from "@/config/prisma";

const dbUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const isExplicitTestDb =
  dbUrl.includes("_test") || process.env.TEST_DATABASE_URL !== undefined;
const isLocalDb =
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1") ||
  dbUrl.includes("@dev_db:");
const isVitestRun = process.env.VITEST === "true";
const isDbTest = isExplicitTestDb || (isVitestRun && isLocalDb);
let migrationPromise: Promise<void> | null = null;

export async function runMigrations(): Promise<void> {
  if (!isDbTest) return;
  if (!dbUrl) return;
  if (!migrationPromise) {
    migrationPromise = Promise.resolve().then(() => {
      execSync("npx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: dbUrl },
        cwd: path.resolve(__dirname, "../.."), // apps/api
        stdio: "inherit",
      });
    });
  }
  await migrationPromise;
}

export async function disconnectDb(): Promise<void> {
  await basePrisma.$disconnect();
}

/**
 * Truncate tenant-scoped and related tables for a clean state (use in afterEach if needed).
 * Order respects foreign keys. Uses raw SQL for speed.
 */
export async function cleanTestTables(): Promise<void> {
  if (!isDbTest) return;
  await basePrisma.$executeRawUnsafe(
    `TRUNCATE TABLE refresh_tokens, audit_logs, location_inventory, transfer_logs, transfer_items, transfers, sale_payments, sale_items, sales, product_discounts, variation_photos, product_sub_variations, product_variations, products, categories, locations, vendors, members, users CASCADE`,
  );
}
