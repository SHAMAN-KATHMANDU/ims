"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCrmSources,
  createCrmSource,
  updateCrmSource,
  deleteCrmSource,
  getCrmJourneyTypes,
  createCrmJourneyType,
  updateCrmJourneyType,
  deleteCrmJourneyType,
  type GetCrmSourcesParams,
  type GetCrmJourneyTypesParams,
} from "../services/crm-settings.service";

export const crmSettingsKeys = {
  all: ["crm-settings"] as const,
  sources: (params?: GetCrmSourcesParams) =>
    [...crmSettingsKeys.all, "sources", params] as const,
  journeyTypes: (params?: GetCrmJourneyTypesParams) =>
    [...crmSettingsKeys.all, "journey-types", params] as const,
};

// ── Sources ──────────────────────────────────────────────────────────────────

export function useCrmSources(params?: GetCrmSourcesParams) {
  return useQuery({
    queryKey: crmSettingsKeys.sources(params),
    queryFn: () => getCrmSources(params),
  });
}

export function useCreateCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCrmSource(name),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

export function useUpdateCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmSource(id, name),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

export function useDeleteCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrmSource(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

// ── Journey Types ─────────────────────────────────────────────────────────────

export function useCrmJourneyTypes(params?: GetCrmJourneyTypesParams) {
  return useQuery({
    queryKey: crmSettingsKeys.journeyTypes(params),
    queryFn: () => getCrmJourneyTypes(params),
  });
}

export function useCreateCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCrmJourneyType(name),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}

export function useUpdateCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmJourneyType(id, name),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}

export function useDeleteCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrmJourneyType(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}
