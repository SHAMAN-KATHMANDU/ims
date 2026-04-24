"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteOverwrite,
  getEffectivePermissions,
  getOverwrites,
  upsertOverwrite,
} from "../services/permissions.service";
import type { UpsertOverwriteData } from "../types";

export const overwriteKeys = {
  all: ["overwrites"] as const,
  list: (resourceId: string) =>
    [...overwriteKeys.all, "list", resourceId] as const,
  effective: (resourceId: string) =>
    [...overwriteKeys.all, "effective", resourceId] as const,
};

export function useOverwrites(resourceId: string | undefined) {
  return useQuery({
    queryKey: overwriteKeys.list(resourceId ?? ""),
    queryFn: () => getOverwrites(resourceId as string),
    enabled: Boolean(resourceId),
    staleTime: 30_000,
  });
}

export function useEffectivePermissions(resourceId: string | undefined) {
  return useQuery({
    queryKey: overwriteKeys.effective(resourceId ?? ""),
    queryFn: () => getEffectivePermissions(resourceId as string),
    enabled: Boolean(resourceId),
    staleTime: 60_000,
  });
}

export function useUpsertOverwrite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      resourceId,
      body,
    }: {
      resourceId: string;
      body: UpsertOverwriteData;
    }) => upsertOverwrite(resourceId, body),
    onSuccess: (_result, { resourceId }) => {
      qc.invalidateQueries({ queryKey: overwriteKeys.list(resourceId) });
      qc.invalidateQueries({ queryKey: overwriteKeys.effective(resourceId) });
    },
  });
}

export function useDeleteOverwrite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      resourceId,
      overwriteId,
    }: {
      resourceId: string;
      overwriteId: string;
    }) => deleteOverwrite(resourceId, overwriteId),
    onSuccess: (_result, { resourceId }) => {
      qc.invalidateQueries({ queryKey: overwriteKeys.list(resourceId) });
      qc.invalidateQueries({ queryKey: overwriteKeys.effective(resourceId) });
    },
  });
}
