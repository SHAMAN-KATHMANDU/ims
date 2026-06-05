/**
 * Backfill CrmJourneyType from existing Contact.journeyType values.
 *
 * Journey type is now an editable lookup, and the API shows a stored
 * Contact.journeyType only when it matches a CrmJourneyType row (else it
 * derives from the active deal). Historically the column was populated by
 * automation/seeds but never surfaced. This script upserts every distinct
 * non-empty Contact.journeyType into CrmJourneyType per tenant so those values
 * become valid, displayable journey types.
 *
 * NON-DESTRUCTIVE: it only inserts lookup rows (idempotent upsert by
 * (tenantId, name)); it never edits or deletes contacts or existing lookups.
 *
 * Usage:
 *   pnpm -F api exec tsx scripts/backfill-journey-types.ts          # dry-run (audit only)
 *   pnpm -F api exec tsx scripts/backfill-journey-types.ts --apply  # write the upserts
 */

import { basePrisma } from "../src/config/prisma";

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    `journey-type backfill — ${apply ? "APPLY" : "DRY-RUN (no writes)"}\n`,
  );

  // Distinct (tenantId, journeyType) across non-deleted contacts.
  const groups = await basePrisma.contact.groupBy({
    by: ["tenantId", "journeyType"],
    where: { deletedAt: null, NOT: { journeyType: null } },
    _count: { _all: true },
  });

  const byTenant = new Map<string, Array<{ name: string; count: number }>>();
  for (const g of groups) {
    const name = (g.journeyType ?? "").trim();
    if (!name) continue;
    const list = byTenant.get(g.tenantId) ?? [];
    list.push({ name, count: g._count._all });
    byTenant.set(g.tenantId, list);
  }

  let tenants = 0;
  let created = 0;
  let alreadyPresent = 0;

  for (const [tenantId, names] of byTenant) {
    tenants++;
    for (const { name, count } of names) {
      const existing = await basePrisma.crmJourneyType.findUnique({
        where: { tenantId_name: { tenantId, name } },
        select: { id: true },
      });
      if (existing) {
        alreadyPresent++;
        continue;
      }
      console.log(
        `  ${apply ? "create" : "would create"} journey type "${name}" for tenant ${tenantId} (${count} contacts)`,
      );
      if (apply) {
        await basePrisma.crmJourneyType.create({ data: { tenantId, name } });
        created++;
      }
    }
  }

  console.log(
    `\nDone. tenants with stored journey types: ${tenants}; ` +
      `already present: ${alreadyPresent}; ` +
      `${apply ? "created" : "to create"}: ${apply ? created : "(run with --apply)"}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
