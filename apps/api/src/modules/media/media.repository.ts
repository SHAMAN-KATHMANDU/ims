import prisma from "@/config/prisma";
import type { MediaAsset, Prisma } from "@prisma/client";

export class MediaRepository {
  async create(
    data: Prisma.MediaAssetUncheckedCreateInput,
  ): Promise<MediaAsset> {
    return prisma.mediaAsset.create({ data });
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<MediaAsset | null> {
    return prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
  }

  async deleteByIdForTenant(id: string, tenantId: string): Promise<void> {
    await prisma.mediaAsset.deleteMany({
      where: { id, tenantId },
    });
  }

  async listForTenant(
    tenantId: string,
    opts: { take: number; cursorId?: string },
  ): Promise<MediaAsset[]> {
    return prisma.mediaAsset.findMany({
      where: { tenantId },
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

  async existsForTenant(
    storageKey: string,
    tenantId: string,
  ): Promise<boolean> {
    const row = await prisma.mediaAsset.findFirst({
      where: { storageKey, tenantId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findByStorageKeyForTenant(
    storageKey: string,
    tenantId: string,
  ): Promise<MediaAsset | null> {
    return prisma.mediaAsset.findFirst({
      where: { storageKey, tenantId },
    });
  }

  async updateFileNameForTenant(
    id: string,
    tenantId: string,
    fileName: string,
  ): Promise<MediaAsset | null> {
    const updated = await prisma.mediaAsset.updateMany({
      where: { id, tenantId },
      data: { fileName },
    });
    if (updated.count === 0) return null;
    return prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
  }
}
