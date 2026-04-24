/**
 * Permission repository — pure data access layer.
 * Fetches user roles, resources, and overwrites from Prisma.
 */

import prisma from "@/config/prisma";

export interface RoleRow {
  id: string;
  permissions: Buffer;
  priority: number;
}

export interface ResourceChainRow {
  id: string;
  path: string;
  depth: number;
}

export interface OverwriteRow {
  resourceId: string;
  roleId?: string | null;
  userId?: string | null;
  allow: Buffer;
  deny: Buffer;
}

export class PermissionRepository {
  /**
   * Read the legacy `User.role` enum value. Used by the resolution engine to
   * preserve `platformAdmin` / `superAdmin` admin semantics regardless of
   * whether the new RbacRole rows have been seeded — these tenant-default
   * admin roles always bypass permission checks.
   */
  async getLegacyUserRole(
    tenantId: string,
    userId: string,
  ): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true },
    });
    return user?.role ?? null;
  }

  /**
   * Get all roles assigned to a user in a tenant, ordered by priority descending.
   */
  async getUserRoles(tenantId: string, userId: string): Promise<RoleRow[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        tenantId,
      },
      select: {
        rbacRole: {
          select: {
            id: true,
            permissions: true,
            priority: true,
          },
        },
      },
      orderBy: {
        rbacRole: {
          priority: "desc",
        },
      },
    });

    return userRoles.map((ur) => ({
      id: ur.rbacRole.id,
      permissions: Buffer.from(ur.rbacRole.permissions),
      priority: ur.rbacRole.priority,
    }));
  }

  /**
   * Fetch the ancestor chain for a resource (root-to-leaf).
   * Uses the materialized path to reconstruct ancestors from the path string.
   * Returns closest ancestors first so we can walk root-to-leaf.
   */
  async getResourceChain(
    tenantId: string,
    resourceId: string,
  ): Promise<ResourceChainRow[]> {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        path: true,
        depth: true,
      },
    });

    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    // path is like '/root/<id1>/<id2>/<self>'
    // Extract all ancestor IDs from the path
    const pathParts = resource.path.split("/").filter((p) => p.length > 0);
    if (pathParts.length === 0) {
      // Only root exists
      return [];
    }

    // pathParts[0] is the root (WORKSPACE), pathParts[-1] is self
    // We need to fetch all resources in the chain
    const chain = await prisma.resource.findMany({
      where: {
        tenantId,
        id: {
          in: pathParts,
        },
      },
      select: {
        id: true,
        path: true,
        depth: true,
      },
      orderBy: {
        depth: "asc", // root to leaf
      },
    });

    return chain;
  }

  /**
   * Get all overwrites (both role and user) for a set of resource IDs.
   */
  async getOverwritesForChain(
    tenantId: string,
    resourceIds: string[],
  ): Promise<OverwriteRow[]> {
    if (resourceIds.length === 0) return [];

    const overwrites = await prisma.permissionOverwrite.findMany({
      where: {
        tenantId,
        resourceId: {
          in: resourceIds,
        },
      },
      select: {
        resourceId: true,
        roleId: true,
        userId: true,
        allow: true,
        deny: true,
      },
    });

    return overwrites.map((o) => ({
      resourceId: o.resourceId,
      roleId: o.roleId,
      userId: o.userId,
      allow: Buffer.from(o.allow),
      deny: Buffer.from(o.deny),
    }));
  }
}

export const permissionRepository = new PermissionRepository();
