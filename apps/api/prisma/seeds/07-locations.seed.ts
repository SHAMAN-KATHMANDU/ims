import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

const LOCATION_SPECS: Array<{
  key: string;
  name: string;
  type: "WAREHOUSE" | "SHOWROOM";
  address?: string;
  isDefaultWarehouse?: boolean;
}> = [
  {
    key: "warehouse",
    name: "Main Warehouse",
    type: "WAREHOUSE",
    address: "Warehouse St 1",
    isDefaultWarehouse: true,
  },
  {
    key: "showroom",
    name: "Showroom",
    type: "SHOWROOM",
    address: "Showroom Ave 1",
  },
  { key: "outlet", name: "Outlet", type: "SHOWROOM", address: "Outlet Park" },
];

export async function seedLocations(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const locationIds: Record<string, string> = {};
  const prefix =
    ctx.slug === "demo"
      ? "Demo"
      : ctx.slug.charAt(0).toUpperCase() + ctx.slug.slice(1);

  for (const loc of LOCATION_SPECS) {
    const name =
      ctx.slug === "demo" ? `Demo ${loc.name}` : `${prefix} ${loc.name}`;
    const location = await prisma.location.upsert({
      where: {
        tenantId_name: { tenantId: ctx.tenantId, name },
      },
      create: {
        tenantId: ctx.tenantId,
        name,
        type: loc.type,
        address: loc.address ?? null,
        isActive: true,
        isDefaultWarehouse: loc.isDefaultWarehouse ?? false,
      },
      update: {
        type: loc.type,
        address: loc.address ?? null,
        isDefaultWarehouse: loc.isDefaultWarehouse ?? false,
      },
    });
    locationIds[loc.key] = location.id;
  }

  return { ...ctx, locationIds };
}
