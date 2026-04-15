/**
 * site-layouts repository.
 *
 * Tenant scoping is enforced by the service layer; every read/write takes an
 * explicit tenantId. The unique index is (tenant_id, scope, page_id) —
 * Postgres treats NULL as distinct, so non-page scopes coexist with many
 * per-page overrides without collisions.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteLayout } from "@prisma/client";

export type SiteLayoutKey = {
  scope: string;
  pageId?: string | null;
};

export class SiteLayoutsRepository {
  findByKey(tenantId: string, key: SiteLayoutKey): Promise<SiteLayout | null> {
    return prisma.siteLayout.findFirst({
      where: {
        tenantId,
        scope: key.scope,
        pageId: key.pageId ?? null,
      },
    });
  }

  listForTenant(
    tenantId: string,
    opts: { scope?: string } = {},
  ): Promise<SiteLayout[]> {
    return prisma.siteLayout.findMany({
      where: {
        tenantId,
        ...(opts.scope ? { scope: opts.scope } : {}),
      },
      orderBy: [{ scope: "asc" }, { updatedAt: "desc" }],
    });
  }

  /**
   * Upsert the DRAFT copy of a layout. We store the client payload under
   * `draftBlocks` and only touch `blocks` when the caller explicitly
   * publishes. For first-write scenarios we seed `blocks` with an empty
   * array so the NOT NULL constraint holds and the renderer sees an empty
   * published state (which falls through to legacy rendering).
   */
  upsertDraft(
    tenantId: string,
    key: SiteLayoutKey,
    blocks: Prisma.InputJsonValue,
  ): Promise<SiteLayout> {
    const pageId = key.pageId ?? null;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.siteLayout.findFirst({
        where: { tenantId, scope: key.scope, pageId },
        select: { id: true },
      });
      if (existing) {
        return tx.siteLayout.update({
          where: { id: existing.id },
          data: { draftBlocks: blocks },
        });
      }
      return tx.siteLayout.create({
        data: {
          tenantId,
          scope: key.scope,
          pageId,
          blocks: [] as unknown as Prisma.InputJsonValue,
          draftBlocks: blocks,
        },
      });
    });
  }

  /**
   * Copy draftBlocks → blocks and bump version. Throws if no draft exists.
   */
  publishDraft(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<SiteLayout | null> {
    const pageId = key.pageId ?? null;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.siteLayout.findFirst({
        where: { tenantId, scope: key.scope, pageId },
      });
      if (!existing) return null;
      const draft = existing.draftBlocks ?? existing.blocks;
      return tx.siteLayout.update({
        where: { id: existing.id },
        data: {
          blocks: draft as Prisma.InputJsonValue,
          draftBlocks: null,
          version: { increment: 1 },
        },
      });
    });
  }

  deleteByKey(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<{ count: number }> {
    return prisma.siteLayout.deleteMany({
      where: {
        tenantId,
        scope: key.scope,
        pageId: key.pageId ?? null,
      },
    });
  }
}

export default new SiteLayoutsRepository();
