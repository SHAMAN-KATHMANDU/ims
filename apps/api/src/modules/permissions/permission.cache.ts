/**
 * Redis cache for permission resolution results.
 * Uses versioned keys to allow cache invalidation without purging.
 */

import { getRedis } from "@/config/redis";
import { toWire, fromWire } from "@/shared/permissions/bitset";

const PERMISSION_CACHE_VERSION = 1;
const PERMISSION_USER_TTL = 3600; // 1 hour
const PERMISSION_TENANT_VERSION_TTL = 604800; // 7 days

/**
 * Generate cache key for user's effective permissions on a resource.
 */
function userPermKey(
  tenantId: string,
  userId: string,
  resourceId: string,
  version: number,
): string {
  return `perm:u:v${version}:${tenantId}:${userId}:${resourceId}`;
}

/**
 * Generate cache version key for a tenant (used to invalidate all user permissions in that tenant).
 */
function tenantVersionKey(tenantId: string): string {
  return `perm:tenant:version:${tenantId}`;
}

/**
 * Generate cache key for workspace-level permissions (no resourceId).
 */
function workspacePermKey(
  tenantId: string,
  userId: string,
  version: number,
): string {
  return `perm:u:v${version}:${tenantId}:${userId}:workspace`;
}

export class PermissionCache {
  private redis = getRedis();

  /**
   * Get cached effective permissions for a user+resource.
   */
  async get(
    tenantId: string,
    userId: string,
    resourceId: string,
  ): Promise<Buffer | null> {
    const version = await this.getTenantVersion(tenantId);
    const key = userPermKey(tenantId, userId, resourceId, version);

    const cached = await this.redis.getBuffer(key);
    return cached;
  }

  /**
   * Store effective permissions with TTL.
   */
  async set(
    tenantId: string,
    userId: string,
    resourceId: string,
    perms: Buffer,
  ): Promise<void> {
    const version = await this.getTenantVersion(tenantId);
    const key = userPermKey(tenantId, userId, resourceId, version);

    await this.redis.setex(key, PERMISSION_USER_TTL, perms);
  }

  /**
   * Invalidate all permissions for a specific user in a tenant.
   * Done by incrementing the tenant version, making all old keys stale.
   */
  async invalidateUser(tenantId: string, _userId: string): Promise<void> {
    // Incrementing tenant version invalidates all users
    await this.invalidateTenant(tenantId);
  }

  /**
   * Invalidate all permissions in a tenant.
   * Done by incrementing the version key.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    const versionKey = tenantVersionKey(tenantId);
    await this.redis.incr(versionKey);
    // Set expiry so old versions don't accumulate
    await this.redis.expire(versionKey, PERMISSION_TENANT_VERSION_TTL);
  }

  /**
   * Get the current cache version for a tenant.
   * Creates it if it doesn't exist.
   */
  private async getTenantVersion(tenantId: string): Promise<number> {
    const versionKey = tenantVersionKey(tenantId);
    const version = await this.redis.get(versionKey);

    if (!version) {
      // Initialize version to 1
      await this.redis.set(
        versionKey,
        "1",
        "EX",
        PERMISSION_TENANT_VERSION_TTL,
      );
      return 1;
    }

    return parseInt(version, 10);
  }

  /**
   * Clear all cache (for testing).
   */
  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}

export const permissionCache = new PermissionCache();
