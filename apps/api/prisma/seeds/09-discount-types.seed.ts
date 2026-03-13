import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

const DISCOUNT_TYPES: Array<{ name: string; description: string }> = [
  { name: "Member Discount", description: "Percentage off for members" },
  { name: "Seasonal Flat", description: "Flat amount off" },
  { name: "Wholesale", description: "Wholesale discount" },
];

export async function seedDiscountTypes(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const discountTypeIds: Record<string, string> = {};

  for (const dt of DISCOUNT_TYPES) {
    const row = await prisma.discountType.upsert({
      where: {
        tenantId_name: { tenantId: ctx.tenantId, name: dt.name },
      },
      create: {
        tenantId: ctx.tenantId,
        name: dt.name,
        description: dt.description,
      },
      update: { description: dt.description },
    });
    discountTypeIds[dt.name] = row.id;
  }

  return { ...ctx, discountTypeIds };
}
