import prisma from "@/config/prisma";
import type { MediaAsset, Prisma } from "@prisma/client";

export class MediaRepository {
  async create(
    data: Prisma.MediaAssetUncheckedCreateInput,
  ): Promise<MediaAsset> {
    return prisma.mediaAsset.create({ data });
  }

  /**
   * Find a media asset by id within a tenant.
   *
   * Soft-deleted rows are hidden by default — pass `{ includeDeleted: true }`
   * if a caller (e.g. an admin restore flow or a test) needs tombstones.
   */
  async findByIdForTenant(
    id: string,
    tenantId: string,
    opts: { includeDeleted?: boolean } = {},
  ): Promise<MediaAsset | null> {
    const where: Prisma.MediaAssetWhereInput = { id, tenantId };
    if (!opts.includeDeleted) where.deletedAt = null;
    return prisma.mediaAsset.findFirst({ where });
  }

  /**
   * Soft-delete: set `deletedAt` so the row is hidden from listings while
   * the underlying S3 object stays around for recovery / audit. Returns the
   * number of rows affected (0 if not found or already deleted).
   */
  async softDeleteByIdForTenant(id: string, tenantId: string): Promise<number> {
    const res = await prisma.mediaAsset.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return res.count;
  }

  /**
   * Hard delete (kept for tests + the legacy code path). Production callers
   * should prefer `softDeleteByIdForTenant`.
   */
  async deleteByIdForTenant(id: string, tenantId: string): Promise<void> {
    await prisma.mediaAsset.deleteMany({
      where: { id, tenantId },
    });
  }

  async listForTenant(
    tenantId: string,
    opts: {
      take: number;
      cursorId?: string;
      purpose?: string;
      mimePrefix?: string;
      folder?: string;
      includeDeleted?: boolean;
    },
  ): Promise<MediaAsset[]> {
    const where: Prisma.MediaAssetWhereInput = { tenantId };
    if (!opts.includeDeleted) where.deletedAt = null;
    if (opts.purpose) {
      where.purpose = opts.purpose;
    }
    if (opts.mimePrefix) {
      where.mimeType = { startsWith: opts.mimePrefix };
    }
    if (opts.folder !== undefined) {
      if (opts.folder === "__none__") {
        where.folder = null;
      } else {
        where.folder = opts.folder;
      }
    }
    return prisma.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.take,
      ...(opts.cursorId
        ? {
            skip: 1,
            cursor: { id: opts.cursorId },
          }
        : {}),
    });
  }

  async countContactAttachmentsByMediaAssetId(
    mediaAssetId: string,
  ): Promise<number> {
    return prisma.contactAttachment.count({
      where: { mediaAssetId },
    });
  }

  async countMessagesByMediaAssetId(mediaAssetId: string): Promise<number> {
    return prisma.message.count({
      where: { mediaAssetId },
    });
  }

  /**
   * Return the count of SiteLayout rows whose `blocks` or `draftBlocks` JSON
   * mentions either the storage key or the public URL of the asset.
   *
   * The block tree is opaque to us (a tenant can store any block shape), so
   * we use a substring search on the serialized JSON via raw SQL. This is a
   * best-effort guard so we don't accidentally orphan a published page.
   */
  async countSiteLayoutsReferencingAsset(
    tenantId: string,
    storageKey: string,
    publicUrl: string,
  ): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "site_layouts"
      WHERE "tenant_id" = ${tenantId}
        AND (
          "blocks"::text LIKE ${"%" + storageKey + "%"}
          OR "blocks"::text LIKE ${"%" + publicUrl + "%"}
          OR "draft_blocks"::text LIKE ${"%" + storageKey + "%"}
          OR "draft_blocks"::text LIKE ${"%" + publicUrl + "%"}
        )
    `;
    const first = rows[0]?.count;
    return typeof first === "bigint" ? Number(first) : (first ?? 0);
  }

  async existsForTenant(
    storageKey: string,
    tenantId: string,
  ): Promise<boolean> {
    const row = await prisma.mediaAsset.findFirst({
      where: { storageKey, tenantId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findByStorageKeyForTenant(
    storageKey: string,
    tenantId: string,
  ): Promise<MediaAsset | null> {
    return prisma.mediaAsset.findFirst({
      where: { storageKey, tenantId, deletedAt: null },
    });
  }

  /** Another asset in the tenant with the same display name, excluding one id (for rename conflict checks). */
  async findByFileNameForTenantExcludingId(
    tenantId: string,
    fileName: string,
    excludeAssetId: string,
  ): Promise<MediaAsset | null> {
    return prisma.mediaAsset.findFirst({
      where: {
        tenantId,
        fileName,
        deletedAt: null,
        NOT: { id: excludeAssetId },
      },
    });
  }

  async updateFileNameForTenant(
    id: string,
    tenantId: string,
    fileName: string,
  ): Promise<MediaAsset | null> {
    const updated = await prisma.mediaAsset.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { fileName },
    });
    if (updated.count === 0) return null;
    return prisma.mediaAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async updateAssetFields(
    id: string,
    tenantId: string,
    data: {
      fileName?: string;
      altText?: string | null;
      folder?: string | null;
    },
  ): Promise<MediaAsset | null> {
    const updateData: Prisma.MediaAssetUpdateInput = {};
    if (data.fileName !== undefined) updateData.fileName = data.fileName;
    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.folder !== undefined) updateData.folder = data.folder;

    const updated = await prisma.mediaAsset.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: updateData,
    });
    if (updated.count === 0) return null;
    return prisma.mediaAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async listDistinctFoldersForTenant(tenantId: string): Promise<string[]> {
    const result = await prisma.mediaAsset.findMany({
      where: { tenantId, deletedAt: null, folder: { not: null } },
      select: { folder: true },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });
    return result.map((r) => r.folder!).filter(Boolean);
  }
}
