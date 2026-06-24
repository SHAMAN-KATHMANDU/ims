"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMetaIntegrationSummary,
  upsertAppCredentials,
  testCredential,
  addCredential,
  deleteCredential,
  regenerateWebhookToken,
  type UpsertAppCredentialsPayload,
  type TestCredentialPayload,
  type AddCredentialPayload,
} from "../services/meta-integration.service";

export const metaIntegrationKeys = {
  all: ["meta-integration"] as const,
  summary: () => [...metaIntegrationKeys.all, "summary"] as const,
};

/**
 * Fetch the Meta integration summary (app config + credentials list).
 */
export function useMetaIntegrationSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: metaIntegrationKeys.summary(),
    queryFn: () => getMetaIntegrationSummary(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Update app credentials (App ID, App Secret, Graph API version, defaults).
 */
export function useUpdateAppCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertAppCredentialsPayload) =>
      upsertAppCredentials(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: metaIntegrationKeys.all,
      });
      toast.success("App credentials updated");
    },
  });
}

/**
 * Test a credential (Page ID or Ad Account ID + token) without saving.
 * This mutation intentionally does not invalidate the summary query — it's a
 * read-only validation. Errors are handled inline by the caller.
 */
export function useTestCredential() {
  return useMutation({
    mutationFn: (payload: TestCredentialPayload) => testCredential(payload),
  });
}

/**
 * Add a new credential (PAGE or ADS kind).
 */
export function useAddCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCredentialPayload) => addCredential(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: metaIntegrationKeys.all,
      });
      toast.success("Credential added successfully");
    },
  });
}

/**
 * Issue a fresh app-level webhook verify token.
 */
export function useRegenerateWebhookToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateWebhookToken(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: metaIntegrationKeys.all,
      });
      toast.success("Webhook verify token regenerated");
    },
  });
}

/**
 * Delete a credential by ID.
 */
export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: metaIntegrationKeys.all,
      });
      toast.success("Credential removed");
    },
  });
}
