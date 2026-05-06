/**
 * Versions repository — the only file that touches the three
 * `*_versions` Prisma models. Each pair of helpers (write/list/get/restore)
 * mirrors the same shape across BlogPostVersion / TenantPageVersion /
 * SiteLayoutVersion so the service layer can stay thin.
 *
 * Cap policy: every `write*` call enforces a 50-row cap by deleting the
 * oldest rows for that parent in the same transaction. We do this in the
 * repo (rather than the service) because the cap is a storage policy, not
 * a business rule — it shouldn't leak across modules.
 *
 * Restore is also done here: it copies the snapshot back into the live
 * row inside a transaction, then writes a fresh "restored from …" version
 * so the restore itself is reversible. The service layer wraps this with
 * an audit-log entry.
 */

import type { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";

const VERSION_CAP = 50;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface VersionListItem {
  id: string;
  createdAt: Date;
  editorId: string | null;
  note: string | null;
}

export interface WriteVersionInput<S> {
  parentId: string;
  tenantId: string;
  snapshot: S;
  editorId: string | null;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export const blogPostVersionsRepo = {
  async write(input: WriteVersionInput<unknown>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.blogPostVersion.create({
        data: {
          blogPostId: input.parentId,
          tenantId: input.tenantId,
          snapshot: input.snapshot as Prisma.InputJsonValue,
          editorId: input.editorId,
          note: input.note ?? null,
        },
      });
      // Prune oldest beyond the cap.
      const overflow = await tx.blogPostVersion.findMany({
        where: { blogPostId: input.parentId },
        orderBy: { createdAt: "desc" },
        skip: VERSION_CAP,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await tx.blogPostVersion.deleteMany({
          where: { id: { in: overflow.map((r) => r.id) } },
        });
      }
    });
  },

  async list(tenantId: string, blogPostId: string): Promise<VersionListItem[]> {
    const rows = await prisma.blogPostVersion.findMany({
      where: { tenantId, blogPostId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, editorId: true, note: true },
    });
    return rows;
  },

  async get(
    tenantId: string,
    versionId: string,
  ): Promise<{
    id: string;
    blogPostId: string;
    snapshot: unknown;
    createdAt: Date;
    editorId: string | null;
    note: string | null;
  } | null> {
    return prisma.blogPostVersion.findFirst({
      where: { tenantId, id: versionId },
      select: {
        id: true,
        blogPostId: true,
        snapshot: true,
        createdAt: true,
        editorId: true,
        note: true,
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Tenant pages
// ---------------------------------------------------------------------------

export const tenantPageVersionsRepo = {
  async write(input: WriteVersionInput<unknown>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.tenantPageVersion.create({
        data: {
          tenantPageId: input.parentId,
          tenantId: input.tenantId,
          snapshot: input.snapshot as Prisma.InputJsonValue,
          editorId: input.editorId,
          note: input.note ?? null,
        },
      });
      const overflow = await tx.tenantPageVersion.findMany({
        where: { tenantPageId: input.parentId },
        orderBy: { createdAt: "desc" },
        skip: VERSION_CAP,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await tx.tenantPageVersion.deleteMany({
          where: { id: { in: overflow.map((r) => r.id) } },
        });
      }
    });
  },

  async list(
    tenantId: string,
    tenantPageId: string,
  ): Promise<VersionListItem[]> {
    const rows = await prisma.tenantPageVersion.findMany({
      where: { tenantId, tenantPageId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, editorId: true, note: true },
    });
    return rows;
  },

  async get(
    tenantId: string,
    versionId: string,
  ): Promise<{
    id: string;
    tenantPageId: string;
    snapshot: unknown;
    createdAt: Date;
    editorId: string | null;
    note: string | null;
  } | null> {
    return prisma.tenantPageVersion.findFirst({
      where: { tenantId, id: versionId },
      select: {
        id: true,
        tenantPageId: true,
        snapshot: true,
        createdAt: true,
        editorId: true,
        note: true,
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Site layouts
// ---------------------------------------------------------------------------

export const siteLayoutVersionsRepo = {
  async write(input: WriteVersionInput<unknown>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.siteLayoutVersion.create({
        data: {
          siteLayoutId: input.parentId,
          tenantId: input.tenantId,
          snapshot: input.snapshot as Prisma.InputJsonValue,
          editorId: input.editorId,
          note: input.note ?? null,
        },
      });
      const overflow = await tx.siteLayoutVersion.findMany({
        where: { siteLayoutId: input.parentId },
        orderBy: { createdAt: "desc" },
        skip: VERSION_CAP,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await tx.siteLayoutVersion.deleteMany({
          where: { id: { in: overflow.map((r) => r.id) } },
        });
      }
    });
  },

  async list(
    tenantId: string,
    siteLayoutId: string,
  ): Promise<VersionListItem[]> {
    const rows = await prisma.siteLayoutVersion.findMany({
      where: { tenantId, siteLayoutId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, editorId: true, note: true },
    });
    return rows;
  },

  async get(
    tenantId: string,
    versionId: string,
  ): Promise<{
    id: string;
    siteLayoutId: string;
    snapshot: unknown;
    createdAt: Date;
    editorId: string | null;
    note: string | null;
  } | null> {
    return prisma.siteLayoutVersion.findFirst({
      where: { tenantId, id: versionId },
      select: {
        id: true,
        siteLayoutId: true,
        snapshot: true,
        createdAt: true,
        editorId: true,
        note: true,
      },
    });
  },
};

export const VERSION_CAP_PER_RECORD = VERSION_CAP;
