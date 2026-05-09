"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  apiKeysService,
  type CreateApiKeyData,
  type RotateApiKeyData,
} from "../services/api-keys.service";

export type {
  ApiKeyWithSecret,
  CreateApiKeyData,
  RotateApiKeyData,
} from "../services/api-keys.service";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  list: () => [...apiKeyKeys.all, "list"] as const,
  detail: (id: string) => [...apiKeyKeys.all, "detail", id] as const,
};

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.list(),
    queryFn: apiKeysService.listApiKeys,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateApiKeyData) =>
      apiKeysService.createApiKey(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.list() });
      toast({ title: "API key created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RotateApiKeyData }) =>
      apiKeysService.rotateApiKey(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.list() });
      toast({ title: "API key rotated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rotate API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiKeysService.deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.list() });
      toast({ title: "API key deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
