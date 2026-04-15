/**
 * nav-menus service — tenant boundary for editable navigation menus.
 *
 * Mutations assert the website feature is enabled, persist, then fire a
 * revalidation against the tenant-site renderer. Unlike site-layouts, nav
 * menus have no draft/publish workflow yet — a save is a publish. This
 * keeps the editor simple in Phase 2; a draft column can be added later
 * without a schema migration (add `draftItems Json?` to NavMenu).
 */

import { Prisma, type NavMenu } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo from "./nav-menus.repository";
import { revalidateNavMenu as defaultRevalidate } from "./nav-menus.revalidate";
import type { UpsertNavMenuInput } from "./nav-menus.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;
type Revalidate = (tenantId: string, slot: string) => Promise<void>;

export class NavMenusService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const config = await this.sites.findConfig(tenantId);
    if (!config) {
      throw createError("Website feature is not enabled for this tenant.", 403);
    }
    if (!config.websiteEnabled) {
      throw createError("Website feature is disabled for this tenant.", 403);
    }
  }

  async list(tenantId: string): Promise<NavMenu[]> {
    await this.assertEnabled(tenantId);
    return this.repo.listForTenant(tenantId);
  }

  async getBySlot(tenantId: string, slot: string): Promise<NavMenu | null> {
    await this.assertEnabled(tenantId);
    return this.repo.findBySlot(tenantId, slot);
  }

  async upsert(tenantId: string, input: UpsertNavMenuInput): Promise<NavMenu> {
    await this.assertEnabled(tenantId);
    const row = await this.repo.upsert(
      tenantId,
      input.slot,
      input.items as unknown as Prisma.InputJsonValue,
    );
    await this.revalidate(tenantId, input.slot);
    return row;
  }

  async deleteBySlot(tenantId: string, slot: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const res = await this.repo.deleteBySlot(tenantId, slot);
    if (res.count === 0) throw createError("Nav menu not found", 404);
    await this.revalidate(tenantId, slot);
  }
}

export default new NavMenusService();
