/**
 * Demo website-order seed.
 *
 * Creates 5 WebsiteOrder rows for the demo tenant spanning every state
 * the admin UI can land in, so staging has something to look at out of
 * the box:
 *
 *   #1 — PENDING_VERIFICATION  (most recent; shows up under Unverified)
 *   #2 — PENDING_VERIFICATION  (also unverified, with a customer note)
 *   #3 — VERIFIED              (verifiedAt back-dated ~1 day)
 *   #4 — REJECTED              (with a rejection reason)
 *   #5 — CONVERTED_TO_SALE     (linked to a real Sale created via
 *                               createSale — full inventory decrement,
 *                               member upsert, audit log, the works)
 *
 * Idempotent via upsert on `(tenantId, orderCode)`. Safe to re-run.
 * Only applies to the `demo` tenant. Sort-order range 0901+ so it
 * doesn't collide with real dev orders placed during testing, which
 * will likely start at 0001.
 *
 * Order #5 depends on:
 *   - at least one active SHOWROOM location
 *   - at least one product with an active variation
 *   - the admin user (role admin/superAdmin) for `createdById`
 * …all of which `fullTenantSeed` provides by the time this seed runs
 * (it's wired last in `seeds/index.ts`).
 */

import type { PrismaClient, User, Location } from "@prisma/client";
import { createSale } from "@/modules/sales/sale.service";
import type { SeedContext } from "./types";

type ItemSnapshot = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type OrderSeed = {
  orderCode: string;
  status:
    | "PENDING_VERIFICATION"
    | "VERIFIED"
    | "REJECTED"
    | "CONVERTED_TO_SALE";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  rejectionReason: string | null;
  /** Days ago the order was received (simulates a backlog). */
  receivedDaysAgo: number;
  /** For VERIFIED / CONVERTED: how long after receive did admin act. */
  actedDaysAfterReceive: number;
};

const ORDERS: OrderSeed[] = [
  {
    orderCode: "WO-2026-0901",
    status: "PENDING_VERIFICATION",
    customerName: "Anya Sharma",
    customerPhone: "+977 98010101xx",
    customerEmail: "anya@example.com",
    customerNote: null,
    rejectionReason: null,
    receivedDaysAgo: 0,
    actedDaysAfterReceive: 0,
  },
  {
    orderCode: "WO-2026-0902",
    status: "PENDING_VERIFICATION",
    customerName: "Rohan Thapa",
    customerPhone: "+977 98020202xx",
    customerEmail: null,
    customerNote: "Please call after 6pm. Prefer home delivery to Patan.",
    rejectionReason: null,
    receivedDaysAgo: 1,
    actedDaysAfterReceive: 0,
  },
  {
    orderCode: "WO-2026-0903",
    status: "VERIFIED",
    customerName: "Mira Gurung",
    customerPhone: "+977 98030303xx",
    customerEmail: "mira.g@example.com",
    customerNote: "Gift wrap if possible — it's for my sister's birthday.",
    rejectionReason: null,
    receivedDaysAgo: 3,
    actedDaysAfterReceive: 1,
  },
  {
    orderCode: "WO-2026-0904",
    status: "REJECTED",
    customerName: "Unknown",
    customerPhone: "+977 98040404xx",
    customerEmail: null,
    customerNote: null,
    rejectionReason:
      "Spam call — no answer on three attempts, phone disconnected on the fourth.",
    receivedDaysAgo: 5,
    actedDaysAfterReceive: 2,
  },
  {
    orderCode: "WO-2026-0905",
    status: "CONVERTED_TO_SALE",
    customerName: "Priya Khadka",
    customerPhone: "+977 98050505xx",
    customerEmail: "priya.k@example.com",
    customerNote: null,
    rejectionReason: null,
    receivedDaysAgo: 7,
    actedDaysAfterReceive: 2,
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function pickDemoContext(
  prisma: PrismaClient,
  tenantId: string,
): Promise<{
  admin: Pick<User, "id">;
  showroom: Pick<Location, "id">;
  products: Array<{ id: string; name: string; finalSp: string }>;
}> {
  const [admin, showroom, products] = await Promise.all([
    prisma.user.findFirst({
      where: { tenantId, role: { in: ["admin", "superAdmin"] } },
      select: { id: true },
    }),
    prisma.location.findFirst({
      where: { tenantId, type: "SHOWROOM", isActive: true },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      take: 6,
      select: {
        id: true,
        name: true,
        finalSp: true,
      },
    }),
  ]);

  if (!admin) {
    throw new Error("demo-website-orders: no admin user found");
  }
  if (!showroom) {
    throw new Error("demo-website-orders: no active showroom found");
  }
  if (products.length < 2) {
    throw new Error(
      "demo-website-orders: need at least 2 products to build carts",
    );
  }

  return {
    admin,
    showroom,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      finalSp: p.finalSp.toString(),
    })),
  };
}

function buildCart(
  products: Array<{ id: string; name: string; finalSp: string }>,
  indices: number[],
  quantities: number[],
): { items: ItemSnapshot[]; subtotal: number } {
  const items: ItemSnapshot[] = [];
  let subtotal = 0;
  for (let n = 0; n < indices.length; n++) {
    const p = products[indices[n]!]!;
    const qty = quantities[n] ?? 1;
    const unitPrice = Number(p.finalSp);
    const lineTotal = unitPrice * qty;
    items.push({
      productId: p.id,
      productName: p.name,
      unitPrice,
      quantity: qty,
      lineTotal,
    });
    subtotal += lineTotal;
  }
  return { items, subtotal };
}

export async function seedDemoWebsiteOrders(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  if (ctx.slug !== "demo") return ctx;

  console.log("  🛒 Seeding demo website orders...");

  const { admin, showroom, products } = await pickDemoContext(
    prisma,
    ctx.tenantId,
  );

  // Build a simple cart pattern per order — varied so the admin list
  // view has visually distinct rows. Order #5 gets a 3-item cart so the
  // converted Sale has multiple SaleItem rows.
  const cartPatterns: Array<{ indices: number[]; quantities: number[] }> = [
    { indices: [0, 1], quantities: [1, 2] },
    { indices: [2], quantities: [1] },
    { indices: [0, 3], quantities: [2, 1] },
    { indices: [4], quantities: [1] },
    { indices: [1, 3, 5 % products.length], quantities: [1, 1, 2] },
  ];

  for (let n = 0; n < ORDERS.length; n++) {
    const o = ORDERS[n]!;
    const pattern = cartPatterns[n]!;
    const { items, subtotal } = buildCart(
      products,
      pattern.indices,
      pattern.quantities,
    );

    const createdAt = daysAgo(o.receivedDaysAgo);
    const verifiedAt =
      o.status === "VERIFIED" || o.status === "CONVERTED_TO_SALE"
        ? daysAgo(o.receivedDaysAgo - o.actedDaysAfterReceive)
        : null;
    const rejectedAt =
      o.status === "REJECTED"
        ? daysAgo(o.receivedDaysAgo - o.actedDaysAfterReceive)
        : null;
    const convertedAt =
      o.status === "CONVERTED_TO_SALE"
        ? daysAgo(o.receivedDaysAgo - o.actedDaysAfterReceive)
        : null;

    // For the converted order, run a real createSale to exercise the
    // full conversion path. This decrements inventory and creates a
    // real Sale row that the seeded order links to.
    let convertedSaleId: string | null = null;
    if (o.status === "CONVERTED_TO_SALE") {
      // Look up the first active variation for each product in this cart
      // so createSale receives variationId (not productId).
      const variationIds: Array<{ variationId: string; quantity: number }> = [];
      for (const item of items) {
        const v = await prisma.productVariation.findFirst({
          where: { productId: item.productId, isActive: true },
          select: { id: true },
        });
        if (!v) {
          console.warn(
            `    ⚠️ demo-website-orders: product ${item.productId} has no active variation, skipping in converted sale seed`,
          );
          continue;
        }
        variationIds.push({ variationId: v.id, quantity: item.quantity });
      }

      if (variationIds.length === 0) {
        console.warn(
          "    ⚠️ demo-website-orders: no active variations for converted order; leaving #5 as VERIFIED instead",
        );
      } else {
        try {
          const sale = await createSale(
            { tenantId: ctx.tenantId, userId: admin.id },
            {
              locationId: showroom.id,
              memberPhone: o.customerPhone,
              memberName: o.customerName,
              items: variationIds,
              notes: `From website order ${o.orderCode} — seeded`,
              payments: [{ method: "cash", amount: subtotal }],
            },
          );
          convertedSaleId = sale.id;
        } catch (err) {
          console.warn(
            `    ⚠️ demo-website-orders: createSale for #${n + 1} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    await prisma.websiteOrder.upsert({
      where: {
        tenantId_orderCode: {
          tenantId: ctx.tenantId,
          orderCode: o.orderCode,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        orderCode: o.orderCode,
        status:
          o.status === "CONVERTED_TO_SALE" && !convertedSaleId
            ? "VERIFIED"
            : o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerNote: o.customerNote,
        items: items as unknown as object,
        subtotal,
        currency: "NPR",
        createdAt,
        updatedAt: createdAt,
        verifiedAt,
        verifiedById:
          verifiedAt || o.status === "CONVERTED_TO_SALE" ? admin.id : null,
        rejectedAt,
        rejectedById: rejectedAt ? admin.id : null,
        rejectionReason: o.rejectionReason,
        convertedAt: convertedSaleId ? convertedAt : null,
        convertedById: convertedSaleId ? admin.id : null,
        convertedSaleId,
      },
      update: {
        // On re-run, don't clobber the converted sale link if it
        // already points at an existing sale — that would orphan
        // history. We only update the cosmetic fields.
        status:
          o.status === "CONVERTED_TO_SALE" && !convertedSaleId
            ? "VERIFIED"
            : o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerNote: o.customerNote,
        rejectionReason: o.rejectionReason,
      },
    });
  }

  console.log(
    `    ✓ ${ORDERS.length} website orders (2 unverified, 1 verified, 1 rejected, 1 converted)`,
  );
  return ctx;
}
