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
} from "@/services/crmSettingsService";

export const crmSettingsKeys = {
  all: ["crm-settings"] as const,
  sources: () => [...crmSettingsKeys.all, "sources"] as const,
  journeyTypes: () => [...crmSettingsKeys.all, "journey-types"] as const,
};

// ── Sources ──────────────────────────────────────────────────────────────────

export function useCrmSources() {
  return useQuery({
    queryKey: crmSettingsKeys.sources(),
    queryFn: getCrmSources,
  });
}

export function useCreateCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCrmSource(name),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.sources() }),
  });
}

export function useUpdateCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmSource(id, name),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.sources() }),
  });
}

export function useDeleteCrmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrmSource(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.sources() }),
  });
}

// ── Journey Types ─────────────────────────────────────────────────────────────

export function useCrmJourneyTypes() {
  return useQuery({
    queryKey: crmSettingsKeys.journeyTypes(),
    queryFn: getCrmJourneyTypes,
  });
}

export function useCreateCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCrmJourneyType(name),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.journeyTypes() }),
  });
}

export function useUpdateCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCrmJourneyType(id, name),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.journeyTypes() }),
  });
}

export function useDeleteCrmJourneyType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCrmJourneyType(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: crmSettingsKeys.journeyTypes() }),
  });
}
