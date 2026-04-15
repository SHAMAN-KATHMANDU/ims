/**
 * nav-menus repository. Tenant scoping enforced at the service boundary.
 */

import prisma from "@/config/prisma";
import type { NavMenu, Prisma } from "@prisma/client";

export class NavMenusRepository {
  listForTenant(tenantId: string): Promise<NavMenu[]> {
    return prisma.navMenu.findMany({
      where: { tenantId },
      orderBy: { slot: "asc" },
    });
  }

  findBySlot(tenantId: string, slot: string): Promise<NavMenu | null> {
    return prisma.navMenu.findFirst({ where: { tenantId, slot } });
  }

  upsert(
    tenantId: string,
    slot: string,
    items: Prisma.InputJsonValue,
  ): Promise<NavMenu> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.navMenu.findFirst({
        where: { tenantId, slot },
        select: { id: true },
      });
      if (existing) {
        return tx.navMenu.update({
          where: { id: existing.id },
          data: { items },
        });
      }
      return tx.navMenu.create({
        data: { tenantId, slot, items },
      });
    });
  }

  deleteBySlot(tenantId: string, slot: string): Promise<{ count: number }> {
    return prisma.navMenu.deleteMany({ where: { tenantId, slot } });
  }
}

export default new NavMenusRepository();
