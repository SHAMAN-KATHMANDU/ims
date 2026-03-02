"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCrmSources,
  createCrmSource,
  updateCrmSource,
  deleteCrmSource,
} from "@/services/crmSettingsService";

export const crmSettingsKeys = {
  all: ["crm-settings"] as const,
  sources: () => [...crmSettingsKeys.all, "sources"] as const,
};

export function useCrmSources() {
  return useQuery({
    queryKey: crmSettingsKeys.sources(),
    queryFn: getCrmSources,
  });
}

export function useCreateCrmSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCrmSource(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmSettingsKeys.sources() });
    },
  });
}

export function useUpdateCrmSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmSource(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmSettingsKeys.sources() });
    },
  });
}

export function useDeleteCrmSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrmSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmSettingsKeys.sources() });
    },
  });
}
