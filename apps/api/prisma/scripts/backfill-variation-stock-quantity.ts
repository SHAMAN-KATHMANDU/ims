/**
 * Backfill `ProductVariation.stockQuantity` from `sum(LocationInventory.quantity)`.
 *
 * `stockQuantity` is a denormalized aggregate used by the product list and
 * low-stock queries. A bug in the variation update path (now fixed) let
 * single-location form values overwrite the aggregate, drifting it away
 * from the real per-location sum. Many existing rows are now stale —
 * often `stockQuantity = 0` while LocationInventory holds the real stock.
 *
 * This script re-derives the cached value across every tenant. It is
 * idempotent and safe to re-run.
 *
 * Default mode is dry-run (reports drift but does not write). Pass --apply
 * to write. Filter by tenant with --tenant=<tenantId>.
 *
 *   npx tsx apps/api/prisma/scripts/backfill-variation-stock-quantity.ts \
 *     [--tenant=<tenantId>] [--apply]
 *
 * Run AFTER deploying the drift-hole fix (product.service.ts:842-848),
 * otherwise the next edit immediately re-introduces drift.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Args {
  tenantId?: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (const a of argv.slice(2)) {
    if (a === "--apply") args.apply = true;
    else if (a.startsWith("--tenant="))
      args.tenantId = a.slice("--tenant=".length);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const where = args.tenantId ? { tenantId: args.tenantId } : {};
  console.log(`Mode: ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Tenant filter: ${args.tenantId ?? "(all tenants)"}`);

  const variations = await prisma.productVariation.findMany({
    where,
    select: {
      id: true,
      stockQuantity: true,
      locationInventory: { select: { quantity: true } },
    },
  });
  console.log(`Scanning ${variations.length} variation(s)...`);

  let drifted = 0;
  let updated = 0;
  let totalCachedBefore = 0;
  let totalRealAfter = 0;

  const driftSamples: Array<{ id: string; cached: number; real: number }> = [];

  for (const v of variations) {
    const real = v.locationInventory.reduce((s, li) => s + li.quantity, 0);
    totalCachedBefore += v.stockQuantity;
    totalRealAfter += real;
    if (v.stockQuantity === real) continue;

    drifted++;
    if (driftSamples.length < 10) {
      driftSamples.push({ id: v.id, cached: v.stockQuantity, real });
    }

    if (args.apply) {
      await prisma.productVariation.update({
        where: { id: v.id },
        data: { stockQuantity: real },
      });
      updated++;
    }
  }

  console.log(`Drifted variations: ${drifted} / ${variations.length}`);
  console.log(`Cached sum (before): ${totalCachedBefore}`);
  console.log(`Real sum (post-backfill): ${totalRealAfter}`);
  console.log(`Delta: ${totalRealAfter - totalCachedBefore}`);

  if (driftSamples.length > 0) {
    console.log("\nSample drifted rows:");
    for (const s of driftSamples) {
      console.log(`  variation=${s.id}  cached=${s.cached}  real=${s.real}`);
    }
  }

  if (args.apply) {
    console.log(`\nUpdated ${updated} row(s).`);
  } else {
    console.log("\nDry-run only. Re-run with --apply to write changes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
