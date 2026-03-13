import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

const VENDOR_SPECS: Array<{
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
}> = [
  {
    name: "Vendor A",
    contact: "Contact A",
    phone: "9810000001",
    address: "Kathmandu",
  },
  {
    name: "Vendor B",
    contact: "Contact B",
    phone: "9810000002",
    address: "Lalitpur",
  },
  { name: "Vendor C", contact: "Contact C", phone: "9810000003" },
  {
    name: "Vendor D",
    contact: "Contact D",
    phone: "9810000004",
    address: "Bhaktapur",
  },
];

export async function seedVendors(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const vendorIds: string[] = [];
  const prefix = ctx.slug.toUpperCase();

  for (let i = 0; i < VENDOR_SPECS.length; i++) {
    const v = VENDOR_SPECS[i];
    const name = ctx.slug === "demo" ? v.name : `${prefix} ${v.name}`;
    const vendor = await prisma.vendor.upsert({
      where: {
        tenantId_name: { tenantId: ctx.tenantId, name },
      },
      create: {
        tenantId: ctx.tenantId,
        name,
        contact: v.contact ?? null,
        phone: v.phone ?? null,
        address: v.address ?? null,
      },
      update: {
        contact: v.contact ?? null,
        phone: v.phone ?? null,
        address: v.address ?? null,
      },
    });
    vendorIds.push(vendor.id);
  }

  return { ...ctx, vendorIds };
}
