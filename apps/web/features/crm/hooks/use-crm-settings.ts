"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
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

export function useCrmSources(
  params?: GetCrmSourcesParams,
  options?: { enabled?: boolean },
) {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useQuery({
    queryKey: crmSettingsKeys.sources(params),
    queryFn: () => getCrmSources(params),
    enabled: pipelinesEnabled && (options?.enabled ?? true),
  });
}

export function useCreateCrmSource() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "sources", "create"],
    mutationFn: (name: string) => createCrmSource(name),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

export function useUpdateCrmSource() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "sources", "update"],
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmSource(id, name),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

export function useDeleteCrmSource() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "sources", "delete"],
    mutationFn: (id: string) => deleteCrmSource(id),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "sources"],
      }),
  });
}

// ── Journey Types ─────────────────────────────────────────────────────────────

export function useCrmJourneyTypes(
  params?: GetCrmJourneyTypesParams,
  options?: { enabled?: boolean },
) {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useQuery({
    queryKey: crmSettingsKeys.journeyTypes(params),
    queryFn: () => getCrmJourneyTypes(params),
    enabled: pipelinesEnabled && (options?.enabled ?? true),
  });
}

export function useCreateCrmJourneyType() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "journey-types", "create"],
    mutationFn: (name: string) => createCrmJourneyType(name),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}

export function useUpdateCrmJourneyType() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "journey-types", "update"],
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmJourneyType(id, name),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}

export function useDeleteCrmJourneyType() {
  const qc = useQueryClient();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useMutation({
    mutationKey: [...crmSettingsKeys.all, "journey-types", "delete"],
    mutationFn: (id: string) => deleteCrmJourneyType(id),
    onMutate: async () => {
      if (!pipelinesEnabled) {
        throw new Error("CRM pipeline settings are disabled");
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...crmSettingsKeys.all, "journey-types"],
      }),
  });
}
