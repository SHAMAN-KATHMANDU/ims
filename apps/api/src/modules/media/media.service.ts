import { inferMimeFromFileName } from "@repo/shared";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import {
  buildObjectKey,
  buildPublicUrl,
  keyBelongsToTenant,
  S3KeyError,
} from "@/lib/s3/s3Key";
import { isClientPublicUrlCompatible } from "@/lib/s3/publicUrl";
import {
  deleteS3Object,
  getS3ObjectFirstBytes,
  isS3CredentialsOrPermissionError,
  presignPutObject,
} from "@/lib/s3/s3Storage";
import { createError } from "@/middlewares/errorHandler";
import type {
  MEDIA_PURPOSES,
  PresignBodyDto,
  RegisterMediaAssetDto,
  UpdateMediaAssetDto,
} from "./media.schema";
import {
  MEDIA_PURPOSE_MAX_BYTES,
  MEDIA_SNIFF_MAX_BYTES,
} from "./media.constants";

type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
import { MediaRepository } from "./media.repository";
import type { MediaAsset } from "@prisma/client";
import { fromBuffer } from "file-type";

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

const MESSAGE_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function allowedMimesForPurpose(purpose: string): Set<string> {
  switch (purpose) {
    case "product_photo":
      return PRODUCT_MIMES;
    case "contact_attachment":
      return CONTACT_MIMES;
    case "library":
      return LIBRARY_MIMES;
    case "message_media":
      return MESSAGE_MEDIA_MIMES;
    default:
      return new Set();
  }
}

function normalizeMime(m: string): string {
  return m.toLowerCase().trim();
}

function mimesMatchDeclared(detected: string, declared: string): boolean {
  const d = normalizeMime(declared);
  const x = normalizeMime(detected);
  if (x === d) return true;
  if (
    (x === "image/jpeg" && d === "image/jpg") ||
    (x === "image/jpg" && d === "image/jpeg")
  ) {
    return true;
  }
  if (
    d ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    x === "application/zip"
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves effective MIME for storage and signing, allowing application/octet-stream
 * when fileName yields an allowed extension.
 */
function resolveEffectiveMimeForPurpose(
  purpose: MediaPurpose,
  mimeType: string,
  fileName: string | undefined,
): string {
  const m = normalizeMime(mimeType);
  const allowed = allowedMimesForPurpose(purpose);
  if (allowed.has(m)) return m;
  if (m === "application/octet-stream") {
    const inferred = inferMimeFromFileName(fileName);
    if (inferred && allowed.has(normalizeMime(inferred))) {
      return normalizeMime(inferred);
    }
  }
  throw createError(
    "MIME type not allowed for this purpose, or could not infer type from file extension",
    400,
  );
}

function mapS3Failure(e: unknown): never {
  if (e instanceof Error && e.message === "S3_NOT_CONFIGURED") {
    throw createError("Object storage is not configured", 503);
  }
  if (isS3CredentialsOrPermissionError(e)) {
    throw createError(
      "Object storage credentials or permissions are invalid",
      503,
    );
  }
  throw createError("Object storage operation failed; try again later", 502);
}

function resolveEntityForPresign(body: PresignBodyDto): {
  entity: string;
  entityId: string;
} {
  switch (body.purpose) {
    case "product_photo": {
      if (body.entityType && body.entityType !== "products") {
        throw createError(
          "For product_photo, entityType must be products or omitted",
          400,
        );
      }
      const entityId = body.entityId ?? "draft";
      return { entity: "products", entityId };
    }
    case "contact_attachment": {
      if (body.entityType && body.entityType !== "contacts") {
        throw createError(
          "For contact_attachment, entityType must be contacts or omitted",
          400,
        );
      }
      return { entity: "contacts", entityId: body.entityId! };
    }
    case "library": {
      if (body.entityType && body.entityType !== "library") {
        throw createError(
          "For library, entityType must be library or omitted",
          400,
        );
      }
      return { entity: "library", entityId: body.entityId ?? "general" };
    }
    case "message_media": {
      if (body.entityType && body.entityType !== "messages") {
        throw createError(
          "For message_media, entityType must be messages or omitted",
          400,
        );
      }
      return { entity: "messages", entityId: body.entityId! };
    }
    default:
      throw createError("Invalid purpose", 400);
  }
}

async function verifyObjectMagicBytes(
  storageKey: string,
  declaredMime: string,
): Promise<void> {
  if (!env.photosEnforceContentSniff || !env.photosS3Configured) return;
  let buf: Buffer;
  try {
    buf = await getS3ObjectFirstBytes(storageKey, MEDIA_SNIFF_MAX_BYTES);
  } catch (e: unknown) {
    mapS3Failure(e);
  }
  const ft = await fromBuffer(buf);
  if (ft) {
    if (!mimesMatchDeclared(ft.mime, declaredMime)) {
      throw createError(
        `File content does not match declared type (detected ${ft.mime})`,
        400,
      );
    }
    return;
  }
  const d = normalizeMime(declaredMime);
  if (
    d === "application/pdf" &&
    buf.length >= 4 &&
    buf.subarray(0, 4).toString() === "%PDF"
  ) {
    return;
  }
  if (
    d === "application/msword" &&
    buf.length >= 4 &&
    buf.readUInt32LE(0) === 0xd0cf11e0
  ) {
    return;
  }
  logger.warn(
    "media.register: optional content sniff could not detect type; allowing register",
    undefined,
    { storageKey, declaredMime },
  );
}

export class MediaService {
  constructor(private readonly repo = new MediaRepository()) {}

  async presign(
    tenantId: string,
    body: PresignBodyDto,
  ): Promise<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
    contentType: string;
    expiresAt: string;
    maxBytes: number;
    requiresCompletion: true;
  }> {
    if (!env.photosS3Configured) {
      throw createError(
        "Object storage is not configured (set AWS_REGION, PHOTOS_S3_BUCKET, PHOTOS_PUBLIC_URL_PREFIX)",
        503,
      );
    }
    const effectiveMime = resolveEffectiveMimeForPurpose(
      body.purpose,
      body.mimeType,
      body.fileName,
    );
    const { entity, entityId } = resolveEntityForPresign(body);
    let key: string;
    try {
      key = buildObjectKey({
        storageEnv: env.photosS3KeyPrefix,
        tenantId,
        entity,
        entityId,
        mimeType: effectiveMime,
        fileName: body.fileName,
      });
    } catch (e) {
      if (e instanceof S3KeyError) {
        throw createError(e.message, 400);
      }
      throw e;
    }
    const maxBytes = MEDIA_PURPOSE_MAX_BYTES[body.purpose];
    const contentType = normalizeMime(effectiveMime);
    logger.request("media presign issued", undefined, {
      event: "media.presign.issued",
      tenantId,
      purpose: body.purpose,
      key,
      contentLength: body.contentLength,
    });
    try {
      const { url, expiresAt } = await presignPutObject(
        key,
        contentType,
        body.contentLength,
      );
      const publicUrl = buildPublicUrl(key, env.photosPublicUrlPrefix);
      return {
        uploadUrl: url,
        key,
        publicUrl,
        contentType,
        expiresAt,
        maxBytes,
        requiresCompletion: true,
      };
    } catch (e: unknown) {
      mapS3Failure(e);
    }
  }

  async registerAsset(
    tenantId: string,
    userId: string,
    body: RegisterMediaAssetDto,
  ): Promise<{ asset: MediaAsset; created: boolean }> {
    const keyOpts = { allowLegacyKeys: env.photosAllowLegacyKeys };
    if (
      !keyBelongsToTenant(
        body.storageKey,
        tenantId,
        env.photosS3KeyPrefix,
        keyOpts,
      )
    ) {
      throw createError("Invalid storage key for tenant", 400);
    }
    const canonicalPublicUrl = buildPublicUrl(
      body.storageKey,
      env.photosPublicUrlPrefix,
    );
    if (
      !isClientPublicUrlCompatible(
        body.storageKey,
        body.publicUrl,
        env.photosPublicUrlPrefix,
        env.photosPublicUrlAliases,
      )
    ) {
      throw createError(
        "publicUrl does not match storage key and configured public URL prefix (or aliases)",
        400,
      );
    }
    const effectiveMime = resolveEffectiveMimeForPurpose(
      body.purpose,
      body.mimeType,
      body.fileName,
    );
    if (
      body.byteSize != null &&
      body.byteSize > MEDIA_PURPOSE_MAX_BYTES[body.purpose]
    ) {
      throw createError("File size exceeds limit for this purpose", 400);
    }

    const existing = await this.repo.findByStorageKeyForTenant(
      body.storageKey,
      tenantId,
    );
    if (existing) {
      logger.request("media register deduped", undefined, {
        event: "media.register.idempotent",
        tenantId,
        storageKey: body.storageKey,
      });
      return { asset: existing, created: false };
    }

    await verifyObjectMagicBytes(body.storageKey, effectiveMime);

    const created = await this.repo.create({
      tenantId,
      storageKey: body.storageKey,
      publicUrl: canonicalPublicUrl,
      fileName: body.fileName,
      mimeType: effectiveMime,
      byteSize: body.byteSize ?? null,
      purpose: body.purpose,
      uploadedById: userId,
    });
    logger.request("media asset registered", undefined, {
      event: "media.register.completed",
      tenantId,
      storageKey: body.storageKey,
    });
    return { asset: created, created: true };
  }

  async listAssets(
    tenantId: string,
    opts: {
      take: number;
      cursorId?: string;
      purpose?: string;
      mimePrefix?: string;
    },
  ): Promise<{ items: MediaAsset[]; nextCursor: string | null }> {
    const pageSize = opts.take;
    const fetchCount = pageSize + 1;
    const rows = await this.repo.listForTenant(tenantId, {
      take: fetchCount,
      cursorId: opts.cursorId,
      purpose: opts.purpose,
      mimePrefix: opts.mimePrefix,
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
    const [contactRefs, messageRefs] = await Promise.all([
      this.repo.countContactAttachmentsByMediaAssetId(assetId),
      this.repo.countMessagesByMediaAssetId(assetId),
    ]);
    if (contactRefs > 0 || messageRefs > 0) {
      throw createError(
        "Media asset is still linked to a contact attachment or message; remove those first",
        409,
      );
    }
    if (row.storageKey) {
      if (!env.photosS3Configured) {
        throw createError(
          "Object storage is not configured; cannot delete stored object",
          503,
        );
      }
      try {
        await deleteS3Object(row.storageKey);
      } catch (e: unknown) {
        mapS3Failure(e);
      }
    }
    await this.repo.deleteByIdForTenant(assetId, tenantId);
  }

  async updateAsset(
    tenantId: string,
    assetId: string,
    dto: UpdateMediaAssetDto,
  ): Promise<MediaAsset> {
    const current = await this.repo.findByIdForTenant(assetId, tenantId);
    if (!current) {
      throw createError("Media asset not found", 404);
    }

    const nextName = dto.fileName;
    if (current.fileName === nextName) {
      return current;
    }

    const conflict = await this.repo.findByFileNameForTenantExcludingId(
      tenantId,
      nextName,
      assetId,
    );
    if (conflict) {
      throw createError("Media asset name already exists", 409);
    }

    const updated = await this.repo.updateFileNameForTenant(
      assetId,
      tenantId,
      nextName,
    );
    if (!updated) {
      throw createError("Media asset not found", 404);
    }
    return updated;
  }
}
