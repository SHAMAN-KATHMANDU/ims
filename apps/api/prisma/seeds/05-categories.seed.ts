import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

/** Category name -> subcategory names */
const CATEGORY_SPECS: Array<{
  name: string;
  description: string;
  subCategories: string[];
}> = [
  {
    name: "Furniture",
    description: "Furniture and home items",
    subCategories: ["Sofas", "Tables", "Chairs", "Shelving"],
  },
  {
    name: "Electronics",
    description: "Electronic devices",
    subCategories: ["Phones", "Accessories", "Audio", "Power"],
  },
  {
    name: "Apparel",
    description: "Clothing and wear",
    subCategories: ["Men", "Women", "Kids", "Unisex"],
  },
  {
    name: "Home & Kitchen",
    description: "Kitchen and home goods",
    subCategories: ["Cookware", "Decor", "Storage", "Lighting"],
  },
  {
    name: "Sports",
    description: "Sports and outdoor",
    subCategories: ["Fitness", "Outdoor", "Cycling"],
  },
  {
    name: "Stationery",
    description: "Office and school supplies",
    subCategories: ["Writing", "Paper", "Organizers"],
  },
];

export async function seedCategories(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const categoryIds: Record<string, string> = {};
  const subCategoryIds: Record<string, string> = {};

  for (const cat of CATEGORY_SPECS) {
    const category = await prisma.category.upsert({
      where: {
        tenantId_name: { tenantId: ctx.tenantId, name: cat.name },
      },
      create: {
        tenantId: ctx.tenantId,
        name: cat.name,
        description: cat.description,
      },
      update: { description: cat.description },
    });
    categoryIds[cat.name] = category.id;

    for (const subName of cat.subCategories) {
      const sub = await prisma.subCategory.upsert({
        where: {
          categoryId_name: { categoryId: category.id, name: subName },
        },
        create: {
          categoryId: category.id,
          name: subName,
        },
        update: {},
      });
      subCategoryIds[`${cat.name}:${subName}`] = sub.id;
    }
  }

  return {
    ...ctx,
    categoryIds,
    subCategoryIds,
  };
}
