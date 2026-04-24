/**
 * Permission/Role/Overwrite domain types — mirrors the API contract from
 * `apps/api/src/modules/permissions/` and the catalog in
 * `packages/shared/src/permissions/catalog.ts`.
 *
 * NOTE: This feature module is jointly owned by ui-perm-core (F1) and
 * ui-role-mgmt (F2). ui-role-mgmt bootstrapped the scaffold; ui-perm-core
 * will extend with sidebar gating + socket invalidation.
 */

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  /** base64-encoded 64-byte permission bitset */
  permissions: string;
  isSystem: boolean;
  color: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleData {
  name: string;
  priority: number;
  /** base64-encoded 64-byte permission bitset */
  permissions: string;
  color?: string | null;
}

export type UpdateRoleData = Partial<CreateRoleData>;

export interface RolesListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedRolesResponse {
  roles: Role[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RoleMember {
  userId: string;
  username: string;
  role: string;
  assignedAt: string;
}

export type OverwriteSubjectType = "ROLE" | "USER";

export interface PermissionOverwrite {
  id: string;
  tenantId: string;
  resourceId: string;
  subjectType: OverwriteSubjectType;
  roleId: string | null;
  userId: string | null;
  /** base64-encoded 64-byte bitset of explicit ALLOW bits */
  allow: string;
  /** base64-encoded 64-byte bitset of explicit DENY bits */
  deny: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertOverwriteData {
  subjectType: OverwriteSubjectType;
  roleId?: string;
  userId?: string;
  /** base64-encoded 64-byte bitset */
  allow: string;
  /** base64-encoded 64-byte bitset */
  deny: string;
}
