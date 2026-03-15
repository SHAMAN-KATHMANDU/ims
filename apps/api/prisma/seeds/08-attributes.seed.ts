import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

const ATTRIBUTE_SPECS: Array<{ code: string; name: string; values: string[] }> =
  [
    {
      code: "color",
      name: "Color",
      values: ["Brown", "White", "Black", "Navy", "Red", "Grey"],
    },
    { code: "size", name: "Size", values: ["S", "M", "L", "XL"] },
    {
      code: "material",
      name: "Material",
      values: ["Wood", "Metal", "Plastic", "Fabric"],
    },
  ];

export async function seedAttributes(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const attributeTypeIds: Record<string, string> = {};
  const attributeValueIds: Record<string, string[]> = {};

  for (let order = 0; order < ATTRIBUTE_SPECS.length; order++) {
    const spec = ATTRIBUTE_SPECS[order];
    const attrType = await prisma.attributeType.upsert({
      where: {
        tenantId_code: { tenantId: ctx.tenantId, code: spec.code },
      },
      create: {
        tenantId: ctx.tenantId,
        name: spec.name,
        code: spec.code,
        displayOrder: order,
      },
      update: { name: spec.name, displayOrder: order },
    });
    attributeTypeIds[spec.code] = attrType.id;

    const valueIds: string[] = [];
    for (let i = 0; i < spec.values.length; i++) {
      const val = await prisma.attributeValue.upsert({
        where: {
          attributeTypeId_value: {
            attributeTypeId: attrType.id,
            value: spec.values[i],
          },
        },
        create: {
          attributeTypeId: attrType.id,
          value: spec.values[i],
          displayOrder: i,
        },
        update: { displayOrder: i },
      });
      valueIds.push(val.id);
    }
    attributeValueIds[spec.code] = valueIds;
  }

  return {
    ...ctx,
    attributeTypeIds,
    attributeValueIds,
  };
}
