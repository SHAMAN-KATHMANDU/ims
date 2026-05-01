"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag, EnvFeature } from "@/features/flags";
import {
  listPublicApiKeys,
  createPublicApiKey,
  rotatePublicApiKey,
  revokePublicApiKey,
} from "../services/public-api-keys.service";
import type { CreatePublicApiKeyData } from "../types";

export const publicApiKeyKeys = {
  all: ["public-api-keys"] as const,
  lists: () => [...publicApiKeyKeys.all, "list"] as const,
};

export function usePublicApiKeys(options?: { enabled?: boolean }) {
  const featureEnabled = useEnvFeatureFlag(EnvFeature.PUBLIC_DATA_API);
  return useQuery({
    queryKey: publicApiKeyKeys.lists(),
    queryFn: () => listPublicApiKeys(),
    enabled: featureEnabled && (options?.enabled ?? true),
  });
}

export function useCreatePublicApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePublicApiKeyData) => createPublicApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicApiKeyKeys.all });
    },
  });
}

export function useRotatePublicApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rotatePublicApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicApiKeyKeys.all });
    },
  });
}

export function useRevokePublicApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokePublicApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicApiKeyKeys.all });
    },
  });
}
