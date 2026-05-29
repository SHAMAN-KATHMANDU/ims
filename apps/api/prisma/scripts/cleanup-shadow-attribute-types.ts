/**
 * One-shot cleanup for "shadow" AttributeTypes accidentally created by
 * uploads that left the bulk-template's placeholder column headers
 * ("Attribute 1", "Attribute 2", ...) unchanged. Each shadow type was
 * also attached to every imported variation, so the variation panel
 * renders doubled pickers ("Color" + "Attribute 2", "Size" + "Attribute 1").
 *
 * For each shadow type this script:
 *   1. Infers a canonical target AttributeType by finding the tenant's
 *      other type whose `value` set overlaps most with the shadow's.
 *   2. For every variation attached to the shadow:
 *        AGREE        — canonical type is also attached with an equivalent
 *                       value → delete the shadow attachment.
 *        ONLY_SHADOW  — canonical not attached but a matching canonical
 *                       value exists → repoint to canonical.
 *        CONFLICT     — canonical attached with a different value → skip
 *                       and report (requires a human decision).
 *        UNMATCHED    — no canonical value matches the shadow's literal
 *                       string → skip and report.
 *   3. Once a shadow type has zero remaining attachments, deletes the
 *      shadow type (cascades to its values).
 *
 * Default mode is dry-run. Pass --apply to write.
 *
 *   npx tsx apps/api/prisma/scripts/cleanup-shadow-attribute-types.ts \
 *     --tenant=<tenantId> [--apply]
 *
 * The placeholder code regex (/^attribute_\d+$/i) matches what
 * ensureAttributeTypeAndValue would have created from the literal Excel
 * template headers.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHADOW_CODE_PATTERN = /^attribute_\d+$/i;
const MIN_VALUE_OVERLAP_RATIO = 0.5;

interface Args {
  tenantId: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { apply: false };
  for (const a of argv.slice(2)) {
    if (a === "--apply") args.apply = true;
    else if (a.startsWith("--tenant="))
      args.tenantId = a.slice("--tenant=".length);
  }
  if (!args.tenantId) {
    throw new Error("--tenant=<tenantId> is required");
  }
  return args as Args;
}

type Outcome = "AGREE" | "ONLY_SHADOW" | "CONFLICT" | "UNMATCHED";

interface VariationDecision {
  variationId: string;
  productId: string;
  shadowTypeId: string;
  shadowValue: string;
  canonicalTypeId: string;
  canonicalValueId: string | null;
  outcome: Outcome;
  notes?: string;
}

async function inferCanonicalTarget(
  tenantId: string,
  shadowTypeId: string,
): Promise<{ canonicalTypeId: string; overlapRatio: number } | null> {
  const shadowValues = await prisma.attributeValue.findMany({
    where: { attributeTypeId: shadowTypeId },
    select: { value: true },
  });
  const shadowSet = new Set(shadowValues.map((v) => v.value.toLowerCase()));
  if (shadowSet.size === 0) return null;

  const otherTypes = await prisma.attributeType.findMany({
    where: {
      tenantId,
      id: { not: shadowTypeId },
      NOT: { code: { startsWith: "attribute_", mode: "insensitive" } },
    },
    include: { values: { select: { value: true } } },
  });

  let best: { canonicalTypeId: string; overlapRatio: number } | null = null;
  for (const t of otherTypes) {
    if (t.values.length === 0) continue;
    const canonSet = new Set(t.values.map((v) => v.value.toLowerCase()));
    let overlap = 0;
    for (const v of shadowSet) if (canonSet.has(v)) overlap++;
    const ratio = overlap / shadowSet.size;
    if (!best || ratio > best.overlapRatio) {
      best = { canonicalTypeId: t.id, overlapRatio: ratio };
    }
  }
  if (!best || best.overlapRatio < MIN_VALUE_OVERLAP_RATIO) return null;
  return best;
}

async function classify(
  shadowTypeId: string,
  canonicalTypeId: string,
): Promise<VariationDecision[]> {
  const attachments = await prisma.productVariationAttribute.findMany({
    where: { attributeTypeId: shadowTypeId },
    include: {
      attributeValue: { select: { value: true } },
      variation: { select: { id: true, productId: true } },
    },
  });

  const canonicalValues = await prisma.attributeValue.findMany({
    where: { attributeTypeId: canonicalTypeId },
    select: { id: true, value: true },
  });
  const canonicalByValue = new Map(
    canonicalValues.map((v) => [v.value.toLowerCase(), v.id]),
  );

  const decisions: VariationDecision[] = [];
  for (const att of attachments) {
    const shadowValue = att.attributeValue.value;
    const canonicalValueId =
      canonicalByValue.get(shadowValue.toLowerCase()) ?? null;

    const existingCanonical = await prisma.productVariationAttribute.findUnique(
      {
        where: {
          variationId_attributeTypeId: {
            variationId: att.variationId,
            attributeTypeId: canonicalTypeId,
          },
        },
        include: { attributeValue: { select: { value: true } } },
      },
    );

    let outcome: Outcome;
    let notes: string | undefined;
    if (existingCanonical) {
      const sameValue =
        existingCanonical.attributeValue.value.toLowerCase() ===
        shadowValue.toLowerCase();
      if (sameValue) {
        outcome = "AGREE";
      } else {
        outcome = "CONFLICT";
        notes = `canonical has "${existingCanonical.attributeValue.value}", shadow has "${shadowValue}"`;
      }
    } else if (canonicalValueId) {
      outcome = "ONLY_SHADOW";
    } else {
      outcome = "UNMATCHED";
      notes = `no canonical value matches "${shadowValue}"`;
    }

    decisions.push({
      variationId: att.variation.id,
      productId: att.variation.productId,
      shadowTypeId,
      shadowValue,
      canonicalTypeId,
      canonicalValueId,
      outcome,
      notes,
    });
  }
  return decisions;
}

async function applyDecisions(
  decisions: VariationDecision[],
): Promise<{ deleted: number; repointed: number; skipped: number }> {
  let deleted = 0;
  let repointed = 0;
  let skipped = 0;
  for (const d of decisions) {
    if (d.outcome === "AGREE") {
      await prisma.productVariationAttribute.delete({
        where: {
          variationId_attributeTypeId: {
            variationId: d.variationId,
            attributeTypeId: d.shadowTypeId,
          },
        },
      });
      deleted++;
    } else if (d.outcome === "ONLY_SHADOW" && d.canonicalValueId) {
      await prisma.$transaction([
        prisma.productVariationAttribute.delete({
          where: {
            variationId_attributeTypeId: {
              variationId: d.variationId,
              attributeTypeId: d.shadowTypeId,
            },
          },
        }),
        prisma.productVariationAttribute.create({
          data: {
            variationId: d.variationId,
            attributeTypeId: d.canonicalTypeId,
            attributeValueId: d.canonicalValueId,
          },
        }),
      ]);
      repointed++;
    } else {
      skipped++;
    }
  }
  return { deleted, repointed, skipped };
}

async function main() {
  const args = parseArgs(process.argv);
  const tenant = await prisma.tenant.findUnique({
    where: { id: args.tenantId },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) {
    console.error(`Tenant ${args.tenantId} not found`);
    process.exit(1);
  }

  const shadows = await prisma.attributeType.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, code: true, createdAt: true },
  });
  const shadowTypes = shadows.filter((t) => SHADOW_CODE_PATTERN.test(t.code));

  console.log(`Tenant: ${tenant.name} (${tenant.slug}, ${tenant.id})`);
  console.log(`Mode: ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Shadow AttributeTypes detected: ${shadowTypes.length}`);
  if (shadowTypes.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let totalDeleted = 0;
  let totalRepointed = 0;
  let totalSkipped = 0;
  const droppableTypes: string[] = [];

  for (const shadow of shadowTypes) {
    console.log(`\n── ${shadow.name} (code=${shadow.code}, id=${shadow.id})`);
    const target = await inferCanonicalTarget(tenant.id, shadow.id);
    if (!target) {
      console.log(
        "  ⚠ Could not infer canonical target (no other type with >=50% value overlap). Skipping.",
      );
      continue;
    }
    const targetName = (
      await prisma.attributeType.findUnique({
        where: { id: target.canonicalTypeId },
        select: { name: true },
      })
    )?.name;
    console.log(
      `  → maps to "${targetName}" (id=${target.canonicalTypeId}, overlap=${(target.overlapRatio * 100).toFixed(0)}%)`,
    );

    const decisions = await classify(shadow.id, target.canonicalTypeId);
    const counts = decisions.reduce<Record<Outcome, number>>(
      (acc, d) => ({ ...acc, [d.outcome]: (acc[d.outcome] ?? 0) + 1 }),
      { AGREE: 0, ONLY_SHADOW: 0, CONFLICT: 0, UNMATCHED: 0 },
    );
    console.log(
      `  AGREE=${counts.AGREE}  ONLY_SHADOW=${counts.ONLY_SHADOW}  CONFLICT=${counts.CONFLICT}  UNMATCHED=${counts.UNMATCHED}`,
    );

    const conflicts = decisions.filter((d) => d.outcome === "CONFLICT");
    if (conflicts.length > 0) {
      console.log("  CONFLICTS (require manual decision):");
      for (const c of conflicts.slice(0, 10)) {
        console.log(
          `    variation=${c.variationId} product=${c.productId} — ${c.notes}`,
        );
      }
      if (conflicts.length > 10)
        console.log(`    … and ${conflicts.length - 10} more`);
    }
    const unmatched = decisions.filter((d) => d.outcome === "UNMATCHED");
    if (unmatched.length > 0) {
      console.log("  UNMATCHED (no canonical value matches the shadow value):");
      for (const u of unmatched.slice(0, 10)) {
        console.log(`    variation=${u.variationId} — ${u.notes}`);
      }
      if (unmatched.length > 10)
        console.log(`    … and ${unmatched.length - 10} more`);
    }

    if (args.apply) {
      const result = await applyDecisions(decisions);
      console.log(
        `  Applied: deleted=${result.deleted} repointed=${result.repointed} skipped=${result.skipped}`,
      );
      totalDeleted += result.deleted;
      totalRepointed += result.repointed;
      totalSkipped += result.skipped;

      const remaining = await prisma.productVariationAttribute.count({
        where: { attributeTypeId: shadow.id },
      });
      if (remaining === 0) {
        droppableTypes.push(shadow.id);
      } else {
        console.log(
          `  ⚠ ${remaining} attachment(s) remain on shadow type — not deleting the type itself`,
        );
      }
    }
  }

  if (args.apply && droppableTypes.length > 0) {
    console.log(
      `\nDeleting ${droppableTypes.length} fully-drained shadow attribute_type(s)...`,
    );
    await prisma.attributeType.deleteMany({
      where: { id: { in: droppableTypes } },
    });
    console.log("Done.");
  }

  console.log(
    `\nSummary: deleted=${totalDeleted} repointed=${totalRepointed} skipped=${totalSkipped} typesDropped=${droppableTypes.length}`,
  );
  if (!args.apply) {
    console.log("\nDry-run only. Re-run with --apply to write changes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
