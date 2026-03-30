import { env } from "@/config/env";
import {
  buildObjectKey,
  buildPublicUrl,
  keyBelongsToTenant,
  S3KeyError,
} from "@/lib/s3/s3Key";
import { deleteS3Object, presignPutObject } from "@/lib/s3/s3Storage";
import { createError } from "@/middlewares/errorHandler";
import type {
  MEDIA_PURPOSES,
  PresignBodyDto,
  RegisterMediaAssetDto,
} from "./media.schema";

type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
import { MediaRepository } from "./media.repository";
import type { MediaAsset } from "@prisma/client";

const PRODUCT_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const CONTACT_MIMES = new Set([
  ...PRODUCT_MIMES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const LIBRARY_MIMES = new Set(CONTACT_MIMES);

const MAX_BYTES: Record<string, number> = {
  product_photo: 12 * 1024 * 1024,
  contact_attachment: 30 * 1024 * 1024,
  library: 30 * 1024 * 1024,
};

function allowedMimesForPurpose(purpose: string): Set<string> {
  switch (purpose) {
    case "product_photo":
      return PRODUCT_MIMES;
    case "contact_attachment":
      return CONTACT_MIMES;
    case "library":
      return LIBRARY_MIMES;
    default:
      return new Set();
  }
}

function normalizeMime(m: string): string {
  return m.toLowerCase().trim();
}

function resolveEntityForPresign(body: PresignBodyDto): {
  entity: string;
  entityId: string;
} {
  if (body.entityType && body.entityId) {
    return { entity: body.entityType, entityId: body.entityId };
  }
  switch (body.purpose) {
    case "product_photo":
      return {
        entity: "products",
        entityId: body.entityId ?? "draft",
      };
    case "contact_attachment":
      return {
        entity: "contacts",
        entityId: body.entityId!,
      };
    case "library":
      return {
        entity: "library",
        entityId: body.entityId ?? "general",
      };
    default:
      throw createError("Invalid purpose", 400);
  }
}

export class MediaService {
  constructor(private readonly repo = new MediaRepository()) {}

  assertMimeAndPurpose(purpose: MediaPurpose, mimeType: string) {
    const m = normalizeMime(mimeType);
    const allowed = allowedMimesForPurpose(purpose);
    if (!allowed.has(m)) {
      throw createError("MIME type not allowed for this purpose", 400);
    }
  }

  async presign(
    tenantId: string,
    body: PresignBodyDto,
  ): Promise<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
    expiresAt: string;
    maxBytes: number;
  }> {
    if (!env.photosS3Configured) {
      throw createError(
        "Object storage is not configured (set AWS_REGION, PHOTOS_S3_BUCKET, PHOTOS_PUBLIC_URL_PREFIX)",
        503,
      );
    }
    this.assertMimeAndPurpose(body.purpose, body.mimeType);
    const { entity, entityId } = resolveEntityForPresign(body);
    let key: string;
    try {
      key = buildObjectKey({
        storageEnv: env.photosS3KeyPrefix,
        tenantId,
        entity,
        entityId,
        mimeType: body.mimeType,
        fileName: body.fileName,
      });
    } catch (e) {
      if (e instanceof S3KeyError) {
        throw createError(e.message, 400);
      }
      throw e;
    }
    const maxBytes = MAX_BYTES[body.purpose] ?? MAX_BYTES.library;
    try {
      const { url, expiresAt } = await presignPutObject(
        key,
        normalizeMime(body.mimeType),
      );
      const publicUrl = buildPublicUrl(key, env.photosPublicUrlPrefix);
      return {
        uploadUrl: url,
        key,
        publicUrl,
        expiresAt,
        maxBytes,
      };
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "S3_NOT_CONFIGURED") {
        throw createError("Object storage is not configured", 503);
      }
      throw e;
    }
  }

  async registerAsset(
    tenantId: string,
    userId: string,
    body: RegisterMediaAssetDto,
  ): Promise<MediaAsset> {
    if (!keyBelongsToTenant(body.storageKey, tenantId, env.photosS3KeyPrefix)) {
      throw createError("Invalid storage key for tenant", 400);
    }
    const expectedUrl = buildPublicUrl(
      body.storageKey,
      env.photosPublicUrlPrefix,
    );
    if (body.publicUrl !== expectedUrl) {
      throw createError(
        "publicUrl does not match storage key and configured prefix",
        400,
      );
    }
    this.assertMimeAndPurpose(body.purpose, body.mimeType);
    if (body.byteSize != null && body.byteSize > MAX_BYTES[body.purpose]) {
      throw createError("File size exceeds limit for this purpose", 400);
    }
    const exists = await this.repo.existsForTenant(body.storageKey, tenantId);
    if (exists) {
      throw createError("Asset already registered", 409);
    }
    return this.repo.create({
      tenantId,
      storageKey: body.storageKey,
      publicUrl: body.publicUrl,
      fileName: body.fileName,
      mimeType: normalizeMime(body.mimeType),
      byteSize: body.byteSize ?? null,
      purpose: body.purpose,
      uploadedById: userId,
    });
  }

  async listAssets(
    tenantId: string,
    opts: { take: number; cursorId?: string },
  ): Promise<{ items: MediaAsset[]; nextCursor: string | null }> {
    const pageSize = opts.take;
    const fetchCount = pageSize + 1;
    const rows = await this.repo.listForTenant(tenantId, {
      take: fetchCount,
      cursorId: opts.cursorId,
    });
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async deleteAsset(tenantId: string, assetId: string): Promise<void> {
    const row = await this.repo.findByIdForTenant(assetId, tenantId);
    if (!row) {
      throw createError("Media asset not found", 404);
    }
    await deleteS3Object(row.storageKey);
    await this.repo.deleteByIdForTenant(assetId, tenantId);
  }
}
