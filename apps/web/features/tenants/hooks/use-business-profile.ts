"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  getMyBusinessProfile,
  updateMyBusinessProfile,
} from "../services/business-profile.service";
import type { UpdateBusinessProfileData } from "../types";

export const businessProfileKeys = {
  me: ["business-profile", "me"] as const,
};

/**
 * Query hook — fetches the current tenant's business profile.
 * staleTime: 60 s (profile changes rarely during a session).
 */
export function useMyBusinessProfile() {
  return useQuery({
    queryKey: businessProfileKeys.me,
    queryFn: getMyBusinessProfile,
    staleTime: 60_000,
  });
}

/**
 * Mutation hook — PATCH the current tenant's business profile.
 * Invalidates the profile query on success.
 */
export function useUpdateMyBusinessProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (body: UpdateBusinessProfileData) =>
      updateMyBusinessProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessProfileKeys.me });
      // Also invalidate site-config if it exists (used by tenant-site render).
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save business profile",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
