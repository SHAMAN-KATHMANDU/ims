/**
 * RoleService — real Prisma-backed CRUD for the scoped-RBAC management API.
 *
 * Replaces the stubbed handlers in permissions.router.ts so /api/v1/roles and
 * /api/v1/permissions/resources/:id/overwrites actually persist. Returns DTO
 * shapes that match the controller contract: `permissions`, `allow`, `deny`
 * are base64-encoded 64-byte bitsets on the wire.
 *
 * permissionCache.invalidateUser is called whenever a mutation could change
 * a user's effective bitset so the in-flight UI sees fresh data on the next
 * /me/effective fetch.
 */
import prisma from "@/config/prisma";
import { createError } from "@/middlewares/errorHandler";
import { fromWire, toWire } from "@/shared/permissions/bitset";
import { permissionCache } from "./permission.cache";

/**
 * Platform Admin is an internal, locked, cross-tenant role. It must never
 * appear in tenant-facing role lists and cannot be assigned, edited, or
 * deleted via the management API. Hidden in every read; rejected in every
 * write that targets it by name.
 */
const HIDDEN_ROLE_NAMES = ["Platform Admin"] as const;
const isHiddenRoleName = (name: string): boolean =>
  (HIDDEN_ROLE_NAMES as readonly string[]).includes(name);

interface RoleDto {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  permissions: string;
  isSystem: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

function toRoleDto(
  row: {
    id: string;
    tenantId: string;
    name: string;
    priority: number;
    permissions: Buffer | Uint8Array;
    isSystem: boolean;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  memberCount?: number,
): RoleDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    priority: row.priority,
    permissions: toWire(Buffer.from(row.permissions)),
    isSystem: row.isSystem,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(memberCount !== undefined ? { memberCount } : {}),
  };
}

export const roleService = {
  // ── Roles ───────────────────────────────────────────────────────────────
  createRole: async (
    tenantId: string,
    data: {
      name: string;
      priority?: number;
      permissions?: string;
      color?: string;
    },
  ): Promise<RoleDto> => {
    if (isHiddenRoleName(data.name)) {
      throw createError("This role name is reserved", 409);
    }
    const existing = await prisma.rbacRole.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
      select: { id: true },
    });
    if (existing) throw createError("Role with this name already exists", 409);
    const row = await prisma.rbacRole.create({
      data: {
        tenantId,
        name: data.name,
        priority: data.priority ?? 100,
        permissions: data.permissions
          ? fromWire(data.permissions)
          : Buffer.alloc(64),
        color: data.color ?? null,
        isSystem: false,
      },
    });
    await permissionCache.invalidateTenant(tenantId);
    return toRoleDto(row, 0);
  },

  listRoles: async (
    tenantId: string,
    params: { page?: number; limit?: number; search?: string },
  ): Promise<{
    roles: RoleDto[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> => {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const where = {
      tenantId,
      // Hidden roles (e.g. Platform Admin) are internal-only and never
      // surface to tenant admins.
      name: {
        notIn: HIDDEN_ROLE_NAMES as unknown as string[],
        ...(params.search
          ? { contains: params.search, mode: "insensitive" as const }
          : {}),
      },
    };
    const [rows, total] = await Promise.all([
      prisma.rbacRole.findMany({
        where,
        orderBy: { priority: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { users: true } } },
      }),
      prisma.rbacRole.count({ where }),
    ]);
    return {
      roles: rows.map((r) => toRoleDto(r, r._count.users)),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getRoleById: async (tenantId: string, roleId: string): Promise<RoleDto> => {
    const row = await prisma.rbacRole.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { users: true } } },
    });
    if (!row || isHiddenRoleName(row.name)) {
      throw createError("Role not found", 404);
    }
    return toRoleDto(row, row._count.users);
  },

  updateRole: async (
    tenantId: string,
    roleId: string,
    data: {
      name?: string;
      priority?: number;
      permissions?: string;
      color?: string;
    },
  ): Promise<RoleDto> => {
    const existing = await prisma.rbacRole.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!existing || isHiddenRoleName(existing.name)) {
      throw createError("Role not found", 404);
    }
    if (existing.isSystem) {
      // System roles: only color/priority adjustable; permissions/name locked.
      if (data.name !== undefined || data.permissions !== undefined) {
        throw createError(
          "System roles cannot have their name or permissions changed",
          403,
        );
      }
    }
    if (data.name !== undefined && isHiddenRoleName(data.name)) {
      throw createError("This role name is reserved", 409);
    }
    const row = await prisma.rbacRole.update({
      where: { id: roleId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.permissions !== undefined
          ? { permissions: fromWire(data.permissions) }
          : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
      include: { _count: { select: { users: true } } },
    });
    await permissionCache.invalidateTenant(tenantId);
    return toRoleDto(row, row._count.users);
  },

  deleteRole: async (tenantId: string, roleId: string): Promise<void> => {
    const row = await prisma.rbacRole.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!row || isHiddenRoleName(row.name)) {
      throw createError("Role not found", 404);
    }
    if (row.isSystem) throw createError("Cannot delete system role", 403);
    await prisma.rbacRole.delete({ where: { id: roleId } });
    await permissionCache.invalidateTenant(tenantId);
  },

  // ── Role members ────────────────────────────────────────────────────────
  assignUserToRole: async (
    tenantId: string,
    roleId: string,
    userId: string,
  ): Promise<{ userId: string; roleId: string; assignedAt: string }> => {
    const role = await prisma.rbacRole.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, name: true },
    });
    if (!role || isHiddenRoleName(role.name)) {
      throw createError("Role not found", 404);
    }
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) throw createError("User not found in this tenant", 404);
    const row = await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, tenantId, assignedAt: new Date() },
      update: { assignedAt: new Date() },
    });
    await permissionCache.invalidateUser(tenantId, userId);
    return {
      userId: row.userId,
      roleId: row.roleId,
      assignedAt: row.assignedAt.toISOString(),
    };
  },

  unassignUserFromRole: async (
    tenantId: string,
    roleId: string,
    userId: string,
  ): Promise<void> => {
    const role = await prisma.rbacRole.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, name: true },
    });
    if (!role || isHiddenRoleName(role.name)) {
      throw createError("Role not found", 404);
    }
    await prisma.userRole.deleteMany({ where: { userId, roleId, tenantId } });
    await permissionCache.invalidateUser(tenantId, userId);
  },

  // ── Resource overwrites ─────────────────────────────────────────────────
  listPermissionOverwrites: async (
    tenantId: string,
    resourceId: string,
  ): Promise<
    Array<{
      id: string;
      resourceId: string;
      subjectType: "ROLE" | "USER";
      roleId: string | null;
      userId: string | null;
      allow: string;
      deny: string;
    }>
  > => {
    const rows = await prisma.permissionOverwrite.findMany({
      where: { tenantId, resourceId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      resourceId: r.resourceId,
      subjectType: r.subjectType,
      roleId: r.roleId,
      userId: r.userId,
      allow: toWire(Buffer.from(r.allow)),
      deny: toWire(Buffer.from(r.deny)),
    }));
  },

  upsertPermissionOverwrite: async (
    tenantId: string,
    resourceId: string,
    data: {
      subjectType: "ROLE" | "USER";
      roleId?: string;
      userId?: string;
      allow: string;
      deny: string;
    },
  ): Promise<{
    id: string;
    resourceId: string;
    subjectType: "ROLE" | "USER";
    roleId: string | null;
    userId: string | null;
    allow: string;
    deny: string;
  }> => {
    const allow = fromWire(data.allow);
    const deny = fromWire(data.deny);
    const subjectId = data.subjectType === "ROLE" ? data.roleId : data.userId;
    if (!subjectId) {
      throw createError(
        `${data.subjectType === "ROLE" ? "roleId" : "userId"} required for ${
          data.subjectType
        } overwrite`,
        400,
      );
    }

    // Look for existing overwrite for this (resource, subject) pair.
    const existing = await prisma.permissionOverwrite.findFirst({
      where: {
        tenantId,
        resourceId,
        subjectType: data.subjectType,
        ...(data.subjectType === "ROLE"
          ? { roleId: data.roleId ?? null }
          : { userId: data.userId ?? null }),
      },
    });
    const row = existing
      ? await prisma.permissionOverwrite.update({
          where: { id: existing.id },
          data: { allow, deny },
        })
      : await prisma.permissionOverwrite.create({
          data: {
            tenantId,
            resourceId,
            subjectType: data.subjectType,
            roleId: data.subjectType === "ROLE" ? (data.roleId ?? null) : null,
            userId: data.subjectType === "USER" ? (data.userId ?? null) : null,
            allow,
            deny,
          },
        });

    if (data.subjectType === "USER" && data.userId) {
      await permissionCache.invalidateUser(tenantId, data.userId);
    } else {
      await permissionCache.invalidateTenant(tenantId);
    }
    return {
      id: row.id,
      resourceId: row.resourceId,
      subjectType: row.subjectType,
      roleId: row.roleId,
      userId: row.userId,
      allow: toWire(Buffer.from(row.allow)),
      deny: toWire(Buffer.from(row.deny)),
    };
  },

  deletePermissionOverwrite: async (
    tenantId: string,
    resourceId: string,
    overwriteId: string,
  ): Promise<void> => {
    const row = await prisma.permissionOverwrite.findFirst({
      where: { id: overwriteId, tenantId, resourceId },
    });
    if (!row) throw createError("Permission overwrite not found", 404);
    await prisma.permissionOverwrite.delete({ where: { id: overwriteId } });
    if (row.userId) {
      await permissionCache.invalidateUser(tenantId, row.userId);
    } else {
      await permissionCache.invalidateTenant(tenantId);
    }
  },
};
