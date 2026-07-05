"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getConsentDetails,
  submitConsentDecision,
} from "../services/oauth-consent.service";

export const oauthConsentKeys = {
  all: ["oauth-consent"] as const,
  detail: (requestId: string) =>
    [...oauthConsentKeys.all, "detail", requestId] as const,
};

export function useConsentDetails(requestId: string | null) {
  return useQuery({
    queryKey: oauthConsentKeys.detail(requestId ?? "missing"),
    queryFn: () => getConsentDetails(requestId as string),
    enabled: Boolean(requestId),
    retry: false, // 404/410 are terminal — retrying just delays the error state
    staleTime: Infinity,
  });
}

export function useConsentDecision(requestId: string | null) {
  return useMutation({
    mutationFn: (approved: boolean) =>
      submitConsentDecision(requestId as string, approved),
  });
}
