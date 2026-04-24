/**
 * Type definitions for permissions module.
 * These match the Prisma model field names from RBAC_CONTRACT.md §2.
 */

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  permissions: Buffer;
  isSystem: boolean;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface Resource {
  id: string;
  tenantId: string;
  type: string;
  externalId: string;
  parentId: string | null;
  path: string;
  depth: number;
  createdAt: Date;
}

export interface PermissionOverwrite {
  id: string;
  tenantId: string;
  resourceId: string;
  subjectType: "USER" | "ROLE";
  roleId: string | null;
  userId: string | null;
  allow: Buffer;
  deny: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRolesResponse {
  roles: Role[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface EffectivePermissionsResponse {
  resourceId: string;
  permissions: string; // base64 encoded Buffer
}

export interface BulkResolvePermissionsResponse {
  [resourceId: string]: string; // base64 encoded Buffer per resource
}
