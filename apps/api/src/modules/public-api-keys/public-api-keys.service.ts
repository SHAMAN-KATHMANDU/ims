/**
 * Public API key service — generates, verifies, rotates and revokes
 * tenant-scoped read-only API keys bound to a verified TenantDomain.
 *
 * Key string format:
 *   pk_live_<8 hex prefix>_<32 hex secret>
 *
 * Storage:
 *   - prefix    → unique lookup id (NOT secret on its own)
 *   - hash      → bcrypt(secret) — bcryptjs, 12 rounds (matches auth.service)
 *   - last4     → last 4 chars of secret, for UI display
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { TenantApiKey, TenantDomain } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo from "./public-api-keys.repository";
import type { TenantApiKeyWithDomain } from "./public-api-keys.repository";
import type { CreatePublicApiKeyInput } from "./public-api-keys.schema";

type Repo = typeof defaultRepo;

const KEY_PREFIX = "pk_live_";
const PREFIX_HEX_LEN = 8; // 4 bytes -> 8 hex chars
const SECRET_HEX_LEN = 32; // 16 bytes -> 32 hex chars
const BCRYPT_ROUNDS = 12;

export interface IssuedKey {
  /** The full key string. Shown to the user ONCE; never persisted in plain. */
  key: string;
  record: TenantApiKeyWithDomain;
}

export interface PublicApiKeyView {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  rateLimitPerMin: number;
  allowedDomain: { id: string; hostname: string; verifiedAt: Date | null };
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export class PublicApiKeysService {
  constructor(private readonly repo: Repo = defaultRepo) {}

  /** Issue a new key bound to a verified TenantDomain owned by the tenant. */
  async issue(
    tenantId: string,
    input: CreatePublicApiKeyInput,
  ): Promise<IssuedKey> {
    const domain = await this.repo.findVerifiedDomain(
      input.tenantDomainId,
      tenantId,
    );
    if (!domain) {
      throw createError("Tenant domain not found", 404);
    }
    if (!domain.verifiedAt) {
      throw createError(
        "Domain is not DNS-verified yet — verify the TXT record before issuing an API key.",
        400,
      );
    }

    const { key, prefix, secret } = this.generateKey();
    const hash = await bcrypt.hash(secret, BCRYPT_ROUNDS);

    const record = await this.repo.create({
      tenantId,
      tenantDomainId: domain.id,
      name: input.name,
      prefix,
      hash,
      last4: secret.slice(-4),
      rateLimitPerMin: input.rateLimitPerMin,
    });

    return { key, record };
  }

  async list(tenantId: string): Promise<PublicApiKeyView[]> {
    const rows = await this.repo.listByTenant(tenantId);
    return rows.map((row) => this.toView(row));
  }

  async revoke(id: string, tenantId: string): Promise<TenantApiKey> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw createError("API key not found", 404);
    if (existing.revokedAt) {
      throw createError("API key is already revoked", 400);
    }
    return this.repo.update(id, { revokedAt: new Date() });
  }

  /**
   * Rotate: revoke the old key, issue a new one bound to the same domain.
   * Returns the new key string (shown once).
   */
  async rotate(
    id: string,
    tenantId: string,
  ): Promise<{ revokedId: string; issued: IssuedKey }> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw createError("API key not found", 404);
    if (existing.revokedAt) {
      throw createError("Cannot rotate a revoked key — issue a new one", 400);
    }
    await this.repo.update(id, { revokedAt: new Date() });
    const issued = await this.issue(tenantId, {
      name: `${existing.name} (rotated)`,
      tenantDomainId: existing.tenantDomainId,
      rateLimitPerMin: existing.rateLimitPerMin,
    });
    return { revokedId: id, issued };
  }

  /**
   * Verify a key string against the stored hash. Used by the auth middleware.
   * Returns the loaded record on success, or null on any failure mode
   * (so callers always 401 with a single generic message — no enumeration).
   */
  async verifyKey(rawKey: string): Promise<TenantApiKeyWithDomain | null> {
    const parsed = this.parseKey(rawKey);
    if (!parsed) return null;

    const record = await this.repo.findByPrefix(parsed.prefix);
    if (!record) return null;
    if (record.revokedAt) return null;

    const ok = await bcrypt.compare(parsed.secret, record.hash);
    if (!ok) return null;
    return record;
  }

  /** Parse `pk_live_<8>_<32>` → { prefix, secret }, or null if malformed. */
  parseKey(raw: string): { prefix: string; secret: string } | null {
    if (typeof raw !== "string") return null;
    if (!raw.startsWith(KEY_PREFIX)) return null;
    // After "pk_live_": "<8hex>_<32hex>"
    const rest = raw.slice(KEY_PREFIX.length);
    const parts = rest.split("_");
    if (parts.length !== 2) return null;
    const [prefixBody, secret] = parts;
    if (prefixBody.length !== PREFIX_HEX_LEN) return null;
    if (secret.length !== SECRET_HEX_LEN) return null;
    if (!/^[0-9a-f]+$/.test(prefixBody)) return null;
    if (!/^[0-9a-f]+$/.test(secret)) return null;
    return { prefix: `${KEY_PREFIX}${prefixBody}`, secret };
  }

  generateKey(): { key: string; prefix: string; secret: string } {
    const prefixBody = randomBytes(PREFIX_HEX_LEN / 2).toString("hex");
    const secret = randomBytes(SECRET_HEX_LEN / 2).toString("hex");
    const prefix = `${KEY_PREFIX}${prefixBody}`;
    const key = `${prefix}_${secret}`;
    return { key, prefix, secret };
  }

  toView(
    row: TenantApiKey & { tenantDomain?: TenantDomain },
  ): PublicApiKeyView {
    if (!row.tenantDomain) {
      throw createError("API key view requires tenantDomain include", 500);
    }
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      last4: row.last4,
      rateLimitPerMin: row.rateLimitPerMin,
      allowedDomain: {
        id: row.tenantDomain.id,
        hostname: row.tenantDomain.hostname,
        verifiedAt: row.tenantDomain.verifiedAt,
      },
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    };
  }
}

export default new PublicApiKeysService();
