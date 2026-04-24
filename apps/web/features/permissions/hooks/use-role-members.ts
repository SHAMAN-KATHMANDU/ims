"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignUserToRole,
  getRoleMembers,
  unassignUserFromRole,
} from "../services/permissions.service";
import { roleKeys } from "./use-roles";

export const roleMemberKeys = {
  all: ["role-members"] as const,
  list: (roleId: string) => [...roleMemberKeys.all, roleId] as const,
};

export function useRoleMembers(roleId: string | undefined) {
  return useQuery({
    queryKey: roleMemberKeys.list(roleId ?? ""),
    queryFn: () => getRoleMembers(roleId as string),
    enabled: Boolean(roleId),
    staleTime: 30_000,
  });
}

export function useAssignUserToRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      assignUserToRole(roleId, userId),
    onSuccess: (_result, { roleId }) => {
      qc.invalidateQueries({ queryKey: roleMemberKeys.list(roleId) });
      qc.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}

export function useUnassignUserFromRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      unassignUserFromRole(roleId, userId),
    onSuccess: (_result, { roleId }) => {
      qc.invalidateQueries({ queryKey: roleMemberKeys.list(roleId) });
      qc.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}
