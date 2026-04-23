/**
 * Permission resolution engine — business logic for computing effective permissions.
 * Resolution order per plan §3:
 * 1. Cache lookup
 * 2. Load user roles (priority desc)
 * 3. Base mask = OR of all role bitsets
 * 4. ADMINISTRATOR short-circuit
 * 5. Walk ancestor chain root→leaf, applying role overwrites then user overwrites
 * 6. Apply implies transitively
 * 7. Cache + return
 */

import {
  EMPTY_BITSET,
  hasBit,
  setBit,
  clearBit,
  orBitset,
  andNotBitset,
  applyImplies,
  BITSET_BYTES,
  toWire,
} from "@/shared/permissions/bitset";
import { ADMINISTRATOR_BIT } from "@repo/shared/src/permissions/catalog";
import { permissionRepository } from "./permission.repository";
import { permissionCache } from "./permission.cache";
import { createError } from "@/middlewares/errorHandler";

export class PermissionService {
  /**
   * Compute effective permissions for a user on a specific resource.
   * Returns a Buffer representing the user's permissions at that resource.
   */
  async getEffectivePermissions(
    tenantId: string,
    userId: string,
    resourceId: string,
  ): Promise<Buffer> {
    // 1. Cache lookup
    const cached = await permissionCache.get(tenantId, userId, resourceId);
    if (cached) {
      return cached;
    }

    // 2. Load user roles (priority desc)
    const userRoles = await permissionRepository.getUserRoles(tenantId, userId);

    // 3. Base mask = OR of all role bitsets
    let baseMask = EMPTY_BITSET();
    for (const role of userRoles) {
      baseMask = orBitset(baseMask, role.permissions);
    }

    // 4. ADMINISTRATOR short-circuit
    if (hasBit(baseMask, ADMINISTRATOR_BIT)) {
      await permissionCache.set(tenantId, userId, resourceId, baseMask);
      return baseMask;
    }

    // 5. Walk ancestor chain root→leaf
    const chain = await permissionRepository.getResourceChain(
      tenantId,
      resourceId,
    );
    const resourceIds = chain.map((r) => r.id);

    // 6. Get all overwrites for the chain
    const overwrites = await permissionRepository.getOverwritesForChain(
      tenantId,
      resourceIds,
    );

    // Build a map of overwrites per resource
    const overwritesByResource = new Map<
      string,
      { roleId?: string; userId?: string; allow: Buffer; deny: Buffer }[]
    >();
    for (const overwrite of overwrites) {
      if (!overwritesByResource.has(overwrite.resourceId)) {
        overwritesByResource.set(overwrite.resourceId, []);
      }
      overwritesByResource.get(overwrite.resourceId)!.push(overwrite);
    }

    // Apply overwrites node by node. Annotated as plain `Buffer` so the
    // helper return types (Buffer<ArrayBufferLike>) assign cleanly without
    // tripping the Buffer<ArrayBuffer> narrow inferred from Buffer.from().
    let perms: Buffer = Buffer.from(baseMask);
    for (const resource of chain) {
      const nodeOverwrites = overwritesByResource.get(resource.id) || [];

      // Aggregate role overwrites (deny first, then allow, OR'd across all user's roles)
      for (const role of userRoles) {
        const roleOverwrites = nodeOverwrites.filter(
          (o) => o.roleId === role.id,
        );

        for (const overwrite of roleOverwrites) {
          // perms = (perms AND_NOT deny) OR allow
          perms = andNotBitset(perms, overwrite.deny);
          perms = orBitset(perms, overwrite.allow);
        }
      }

      // Apply user overwrite if it exists (deny first, then allow)
      const userOverwrite = nodeOverwrites.find((o) => o.userId === userId);
      if (userOverwrite) {
        perms = andNotBitset(perms, userOverwrite.deny);
        perms = orBitset(perms, userOverwrite.allow);
      }
    }

    // 7. Apply implies transitively
    perms = applyImplies(perms);

    // 8. Cache + return
    await permissionCache.set(tenantId, userId, resourceId, perms);
    return perms;
  }

  /**
   * Check if a user has a specific permission on a resource.
   */
  async can(
    tenantId: string,
    userId: string,
    resourceId: string,
    permissionKey: string,
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(
      tenantId,
      userId,
      resourceId,
    );
    // Check if ADMINISTRATOR bit is set or the specific permission
    if (hasBit(perms, ADMINISTRATOR_BIT)) return true;

    // TODO: import PERMISSION_BY_KEY and check the actual bit
    // For now, return a placeholder
    return false;
  }

  /**
   * Assert a user has a permission, throw 403 if not.
   */
  async assert(
    tenantId: string,
    userId: string,
    resourceId: string,
    permissionKey: string,
  ): Promise<void> {
    const allowed = await this.can(tenantId, userId, resourceId, permissionKey);
    if (!allowed) {
      throw createError(
        `You do not have permission to ${permissionKey}`,
        403,
        "PERMISSION_DENIED",
      );
    }
  }

  /**
   * Filter a list of resource IDs to only those the user can VIEW.
   * Used by list endpoints.
   */
  async filterVisible(
    tenantId: string,
    userId: string,
    resourceIds: string[],
  ): Promise<Set<string>> {
    const visible = new Set<string>();

    // TODO: Batch resolve and check VIEW permission for each
    // For now, return all (placeholder)
    for (const id of resourceIds) {
      visible.add(id);
    }

    return visible;
  }

  /**
   * Bulk resolve permissions for multiple resources.
   * Returns Map<resourceId, Buffer>.
   * Used by frontend to hydrate permission masks.
   */
  async bulkResolve(
    tenantId: string,
    userId: string,
    resourceIds: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const resourceId of resourceIds) {
      const perms = await this.getEffectivePermissions(
        tenantId,
        userId,
        resourceId,
      );
      result.set(resourceId, toWire(perms));
    }

    return result;
  }
}

export const permissionService = new PermissionService();
