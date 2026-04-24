/**
 * Permissions Service — REST client for /api/v1/permissions/*
 *
 * Jointly owned by ui-perm-core (extending) and ui-role-mgmt (bootstrap).
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type {
  Role,
  CreateRoleData,
  UpdateRoleData,
  RolesListParams,
  PaginatedRolesResponse,
  RoleMember,
  PermissionOverwrite,
  UpsertOverwriteData,
} from "../types";

// ─── Roles ──────────────────────────────────────────────────────────────────

export async function getRoles(
  params: RolesListParams = {},
): Promise<PaginatedRolesResponse> {
  const { page = 1, limit = 50, search } = params;
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (search) qs.set("search", search);
  try {
    const { data } = await api.get<{
      success: true;
      data: PaginatedRolesResponse;
    }>(`/permissions/roles?${qs.toString()}`);
    return (
      data.data ?? {
        roles: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
    );
  } catch (error) {
    handleApiError(error, "fetch roles");
  }
}

export async function getRoleById(roleId: string): Promise<Role> {
  try {
    const { data } = await api.get<{
      success: true;
      data: { role: Role };
    }>(`/permissions/roles/${roleId}`);
    return data.data.role;
  } catch (error) {
    handleApiError(error, "fetch role");
  }
}

export async function createRole(body: CreateRoleData): Promise<Role> {
  try {
    const { data } = await api.post<{
      success: true;
      data: { role: Role };
    }>("/permissions/roles", body);
    return data.data.role;
  } catch (error) {
    handleApiError(error, "create role");
  }
}

export async function updateRole(
  roleId: string,
  body: UpdateRoleData,
): Promise<Role> {
  try {
    const { data } = await api.patch<{
      success: true;
      data: { role: Role };
    }>(`/permissions/roles/${roleId}`, body);
    return data.data.role;
  } catch (error) {
    handleApiError(error, "update role");
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  try {
    await api.delete(`/permissions/roles/${roleId}`);
  } catch (error) {
    handleApiError(error, "delete role");
  }
}

// ─── Role Members ───────────────────────────────────────────────────────────

export async function getRoleMembers(roleId: string): Promise<RoleMember[]> {
  try {
    const { data } = await api.get<{
      success: true;
      data: { members: RoleMember[] };
    }>(`/permissions/roles/${roleId}/members`);
    return data.data.members ?? [];
  } catch (error) {
    handleApiError(error, "fetch role members");
  }
}

export async function assignUserToRole(
  roleId: string,
  userId: string,
): Promise<void> {
  try {
    await api.post(`/permissions/roles/${roleId}/members`, { userId });
  } catch (error) {
    handleApiError(error, "assign user to role");
  }
}

export async function unassignUserFromRole(
  roleId: string,
  userId: string,
): Promise<void> {
  try {
    await api.delete(`/permissions/roles/${roleId}/members/${userId}`);
  } catch (error) {
    handleApiError(error, "unassign user from role");
  }
}

// ─── Resource Overwrites ────────────────────────────────────────────────────

export async function getOverwrites(
  resourceId: string,
): Promise<PermissionOverwrite[]> {
  try {
    const { data } = await api.get<{
      success: true;
      data: { overwrites: PermissionOverwrite[] };
    }>(`/permissions/resources/${resourceId}/overwrites`);
    return data.data.overwrites ?? [];
  } catch (error) {
    handleApiError(error, "fetch overwrites");
  }
}

export async function upsertOverwrite(
  resourceId: string,
  body: UpsertOverwriteData,
): Promise<PermissionOverwrite> {
  try {
    const { data } = await api.put<{
      success: true;
      data: { overwrite: PermissionOverwrite };
    }>(`/permissions/resources/${resourceId}/overwrites`, body);
    return data.data.overwrite;
  } catch (error) {
    handleApiError(error, "upsert overwrite");
  }
}

export async function deleteOverwrite(
  resourceId: string,
  overwriteId: string,
): Promise<void> {
  try {
    await api.delete(
      `/permissions/resources/${resourceId}/overwrites/${overwriteId}`,
    );
  } catch (error) {
    handleApiError(error, "delete overwrite");
  }
}

// ─── Effective Permissions ──────────────────────────────────────────────────

export interface EffectivePermissionsResponse {
  resourceId: string;
  /** base64-encoded 64-byte bitset */
  permissions: string;
}

export async function getEffectivePermissions(
  resourceId: string,
): Promise<EffectivePermissionsResponse> {
  try {
    const { data } = await api.get<{
      success: true;
      data: EffectivePermissionsResponse;
    }>(`/permissions/me/effective`, {
      params: { resourceId },
    });
    return data.data;
  } catch (error) {
    handleApiError(error, "fetch effective permissions");
  }
}

export async function bulkResolvePermissions(
  resourceIds: string[],
): Promise<Record<string, string>> {
  try {
    const { data } = await api.post<{
      success: true;
      data: Record<string, string>;
    }>(`/permissions/me/bulk-resolve`, { resourceIds });
    return data.data ?? {};
  } catch (error) {
    handleApiError(error, "bulk resolve permissions");
  }
}
