import { randomUUID } from "crypto";
import path from "path";

export const S3_KEY_ENTITIES = [
  "products",
  "contacts",
  "library",
  "messages",
] as const;
export type S3KeyEntity = (typeof S3_KEY_ENTITIES)[number];

/** Allowed first path segment (deployment environment). */
export const S3_STORAGE_ENV_SEGMENTS = ["dev", "stage", "prod"] as const;
export type S3StorageEnvSegment = (typeof S3_STORAGE_ENV_SEGMENTS)[number];

const ENTITY_SET = new Set<string>(S3_KEY_ENTITIES);
const STORAGE_ENV_SET = new Set<string>(S3_STORAGE_ENV_SEGMENTS);

const TENANT_OR_ENTITY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Folder segment under entity: UUID, draft upload, or short slug. */
const ENTITY_ID_SEGMENT =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|draft|pending|general)$/i;

export class S3KeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "S3KeyError";
  }
}

export function assertValidStorageEnv(storageEnv: string): void {
  if (!STORAGE_ENV_SET.has(storageEnv)) {
    throw new S3KeyError("Invalid storage environment segment");
  }
}

export function buildPublicUrl(key: string, publicUrlPrefix: string): string {
  const prefix = publicUrlPrefix.endsWith("/")
    ? publicUrlPrefix
    : `${publicUrlPrefix}/`;
  const k = key.replace(/^\//, "");
  return `${prefix}${k}`;
}

export function extensionFromMime(mimeType: string): string | null {
  const m: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };
  return m[mimeType.toLowerCase().trim()] ?? null;
}

export function pickExtension(
  fileName: string | undefined,
  mimeType: string,
): string {
  const fromMime = extensionFromMime(mimeType);
  if (fromMime) return fromMime;
  const ext = path.extname(fileName ?? "").toLowerCase();
  if (ext && /^\.[a-z0-9]{1,10}$/i.test(ext)) return ext;
  return ".bin";
}

export function assertValidTenantId(tenantId: string): void {
  if (!TENANT_OR_ENTITY_UUID.test(tenantId)) {
    throw new S3KeyError("Invalid tenant id");
  }
}

/**
 * Object key layout: `{storageEnv}/tenants/{tenantId}/{entity}/{entityId}/{uuid}.{ext}`
 * — keeps one bucket shareable across dev/stage/prod servers without overwriting.
 */
export function buildObjectKey(params: {
  storageEnv: string;
  tenantId: string;
  entity: string;
  entityId: string;
  mimeType: string;
  fileName?: string;
}): string {
  assertValidStorageEnv(params.storageEnv);
  assertValidTenantId(params.tenantId);
  if (!ENTITY_SET.has(params.entity)) {
    throw new S3KeyError("Invalid storage entity");
  }
  if (
    !ENTITY_ID_SEGMENT.test(params.entityId) ||
    params.entityId.includes("..") ||
    params.entityId.includes("/")
  ) {
    throw new S3KeyError(
      "entityId must be draft, pending, general, or a valid UUID",
    );
  }
  const ext = pickExtension(params.fileName, params.mimeType);
  const uuid = randomUUID();
  return `${params.storageEnv}/tenants/${params.tenantId}/${params.entity}/${params.entityId}/${uuid}${ext}`;
}

export function keyBelongsToTenant(
  key: string,
  tenantId: string,
  storageEnv: string,
  options?: { allowLegacyKeys?: boolean },
): boolean {
  assertValidStorageEnv(storageEnv);
  const expected = `${storageEnv}/tenants/${tenantId}/`;
  if (key.includes("..")) return false;
  if (key.startsWith(expected)) return true;
  if (options?.allowLegacyKeys) {
    const legacy = `tenants/${tenantId}/`;
    return key.startsWith(legacy);
  }
  return false;
}

export function keyMatchesContactPrefix(
  key: string,
  tenantId: string,
  contactId: string,
  storageEnv: string,
  options?: { allowLegacyKeys?: boolean },
): boolean {
  if (!TENANT_OR_ENTITY_UUID.test(contactId)) return false;
  if (key.includes("..")) return false;
  const prefix = `${storageEnv}/tenants/${tenantId}/contacts/${contactId}/`;
  if (key.startsWith(prefix)) {
    return keyBelongsToTenant(key, tenantId, storageEnv, options);
  }
  if (options?.allowLegacyKeys) {
    const legacyPrefix = `tenants/${tenantId}/contacts/${contactId}/`;
    return key.startsWith(legacyPrefix);
  }
  return false;
}

export function keyMatchesMessagePrefix(
  key: string,
  tenantId: string,
  conversationId: string,
  storageEnv: string,
  options?: { allowLegacyKeys?: boolean },
): boolean {
  if (!TENANT_OR_ENTITY_UUID.test(conversationId)) return false;
  if (key.includes("..")) return false;
  const prefix = `${storageEnv}/tenants/${tenantId}/messages/${conversationId}/`;
  if (key.startsWith(prefix)) {
    return keyBelongsToTenant(key, tenantId, storageEnv, options);
  }
  if (options?.allowLegacyKeys) {
    const legacyPrefix = `tenants/${tenantId}/messages/${conversationId}/`;
    return key.startsWith(legacyPrefix);
  }
  return false;
}
