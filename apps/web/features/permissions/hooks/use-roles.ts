"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../services/permissions.service";
import type { CreateRoleData, RolesListParams, UpdateRoleData } from "../types";

export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (params: RolesListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};

export function useRoles(params: RolesListParams = {}) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => getRoles(params),
    staleTime: 60_000,
  });
}

export function useRole(roleId: string | undefined) {
  return useQuery({
    queryKey: roleKeys.detail(roleId ?? ""),
    queryFn: () => getRoleById(roleId as string),
    enabled: Boolean(roleId),
    staleTime: 60_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleData) => createRole(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRoleData }) =>
      updateRole(roleId, body),
    onSuccess: (_role, { roleId }) => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
      qc.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}
