import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";
import { PRODUCT_SPECS } from "./data/products";

export async function seedProducts(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const createdById = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!createdById) throw new Error("seedUsers must run before seedProducts");

  const productIds: string[] = [];
  const variationIds: string[] = [];
  const variationIdsByProductId: Record<string, string[]> = {};
  const prefix = ctx.slug.toUpperCase();

  for (let i = 0; i < PRODUCT_SPECS.length; i++) {
    const spec = PRODUCT_SPECS[i];
    const imsCode = `${prefix}-P${String(i + 1).padStart(3, "0")}`;
    const categoryId = ctx.categoryIds[spec.category];
    const subCategoryId =
      ctx.subCategoryIds[`${spec.category}:${spec.subCategory}`];
    const vendorId =
      spec.vendorIndex < ctx.vendorIds.length
        ? ctx.vendorIds[spec.vendorIndex]
        : ctx.vendorIds[0];

    if (!categoryId) throw new Error(`Missing category: ${spec.category}`);

    const product = await prisma.product.upsert({
      where: {
        tenantId_imsCode: { tenantId: ctx.tenantId, imsCode },
      },
      create: {
        tenantId: ctx.tenantId,
        imsCode,
        name: spec.name,
        categoryId,
        subCategory: spec.subCategory,
        subCategoryId: subCategoryId ?? null,
        description: spec.description ?? null,
        costPrice: spec.costPrice,
        mrp: spec.mrp,
        finalSp: spec.finalSp,
        vendorId,
        createdById,
      },
      update: {
        name: spec.name,
        categoryId,
        subCategory: spec.subCategory,
        subCategoryId: subCategoryId ?? null,
        description: spec.description ?? null,
        costPrice: spec.costPrice,
        mrp: spec.mrp,
        finalSp: spec.finalSp,
        vendorId,
      },
    });
    productIds.push(product.id);

    const numVariations = spec.variations ?? 1;
    const vars: string[] = [];
    for (let v = 0; v < numVariations; v++) {
      const variationId = deterministicId(
        "variation",
        `${ctx.tenantId}:${product.id}:${v}`,
      );
      const variation = await prisma.productVariation.upsert({
        where: { id: variationId },
        create: {
          id: variationId,
          tenantId: ctx.tenantId,
          productId: product.id,
          stockQuantity: 0,
        },
        update: { stockQuantity: 0 },
      });
      vars.push(variation.id);
      variationIds.push(variation.id);
    }
    variationIdsByProductId[product.id] = vars;
  }

  return {
    ...ctx,
    productIds,
    variationIds,
    variationIdsByProductId,
  };
}
