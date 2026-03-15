import type { PrismaClient } from "@prisma/client";
import { getSubscriptionPeriod } from "./utils";
import type { SeedContext } from "./types";

const PROMO_SPECS: Array<{
  code: string;
  description: string;
  valueType: "PERCENTAGE" | "FLAT";
  value: number;
  eligibility: "ALL" | "MEMBER" | "NON_MEMBER" | "WHOLESALE";
  usageLimit: number;
  productIndices?: number[];
}> = [
  {
    code: "SAVE10",
    description: "10% off",
    valueType: "PERCENTAGE",
    value: 10,
    eligibility: "ALL",
    usageLimit: 100,
    productIndices: [0, 1, 2, 5],
  },
  {
    code: "FLAT50",
    description: "Flat 50 off",
    valueType: "FLAT",
    value: 50,
    eligibility: "MEMBER",
    usageLimit: 50,
    productIndices: [12, 17],
  },
  {
    code: "WELCOME5",
    description: "5% for new customers",
    valueType: "PERCENTAGE",
    value: 5,
    eligibility: "ALL",
    usageLimit: 200,
  },
];

export async function seedPromos(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const { periodEnd } = getSubscriptionPeriod();
  const now = new Date();
  const prefix = ctx.slug.toUpperCase();
  const promoCodeIds: string[] = [];

  for (const p of PROMO_SPECS) {
    const code = ctx.slug === "demo" ? p.code : `${prefix}-${p.code}`;
    const promo = await prisma.promoCode.upsert({
      where: {
        tenantId_code: { tenantId: ctx.tenantId, code },
      },
      create: {
        tenantId: ctx.tenantId,
        code,
        description: p.description,
        valueType: p.valueType,
        value: p.value,
        overrideDiscounts: false,
        allowStacking: false,
        eligibility: p.eligibility,
        validFrom: now,
        validTo: periodEnd,
        usageLimit: p.usageLimit,
        usageCount: 0,
        isActive: true,
      },
      update: {
        description: p.description,
        valueType: p.valueType,
        value: p.value,
        eligibility: p.eligibility,
        validTo: periodEnd,
        usageLimit: p.usageLimit,
        isActive: true,
      },
    });
    promoCodeIds.push(promo.id);

    if (p.productIndices && p.productIndices.length > 0) {
      const productIdsToLink = p.productIndices
        .filter((idx) => idx < ctx.productIds.length)
        .map((idx) => ctx.productIds[idx]);
      for (const productId of productIdsToLink) {
        await prisma.promoCodeProduct.upsert({
          where: {
            promoCodeId_productId: { promoCodeId: promo.id, productId },
          },
          create: { promoCodeId: promo.id, productId },
          update: {},
        });
      }
    }
  }

  return { ...ctx, promoCodeIds };
}
