import type { SeedContext } from "../types";

export interface SaleItemSpec {
  variationId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}
export interface SaleSpec {
  type: "GENERAL" | "MEMBER";
  locationKey: string;
  memberIndex?: number;
  createdByKey: string;
  items: SaleItemSpec[];
  paymentMethod: "CASH" | "CARD" | "QR" | "FONEPAY" | "CHEQUE";
}

/**
 * Generate 100+ coherent sale specs from context. Uses variationIds and memberIds from ctx.
 */
export function generateSaleSpecs(
  ctx: SeedContext,
  count: number = 110,
): SaleSpec[] {
  const specs: SaleSpec[] = [];
  const locationKeys = ["showroom", "showroom", "showroom", "outlet"];
  const creatorKeys = ["admin", "user", "staff1", "staff2", "user"];
  const paymentMethods: Array<"CASH" | "CARD" | "QR"> = [
    "CASH",
    "CASH",
    "CASH",
    "CARD",
    "QR",
  ];

  for (let i = 0; i < count; i++) {
    const numItems = 1 + (i % 3);
    const items: SaleItemSpec[] = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const varIndex = (i + j * 7) % ctx.variationIds.length;
      const variationId = ctx.variationIds[varIndex];
      const quantity = 1 + ((i + j) % 3);
      const unitPrice = 100 + ((i + varIndex) % 5000);
      const discountPercent = i % 3 === 0 ? 5 : 0;
      const lineTotal = quantity * unitPrice * (1 - discountPercent / 100);
      subtotal += lineTotal;
      items.push({
        variationId,
        quantity,
        unitPrice,
        discountPercent,
      });
    }
    const discount = i % 4 === 0 ? Math.floor(subtotal * 0.05) : 0;
    const total = subtotal - discount;

    specs.push({
      type: i % 3 !== 0 ? "MEMBER" : "GENERAL",
      locationKey: locationKeys[i % locationKeys.length],
      memberIndex: i % 3 !== 0 ? i % ctx.memberIds.length : undefined,
      createdByKey: creatorKeys[i % creatorKeys.length],
      items,
      paymentMethod: paymentMethods[i % paymentMethods.length],
    });
  }
  return specs;
}
