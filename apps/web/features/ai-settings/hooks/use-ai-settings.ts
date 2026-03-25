"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { aiSettingsService } from "../services/ai-settings.service";
import type { UpdateAiSettingsData } from "../types";

export const aiSettingsKeys = {
  all: ["ai-settings"] as const,
  detail: () => [...aiSettingsKeys.all, "detail"] as const,
};

export function useAiSettings() {
  return useQuery({
    queryKey: aiSettingsKeys.detail(),
    queryFn: () => aiSettingsService.get(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateAiSettingsData) => aiSettingsService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.all });
      toast({ title: "AI settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save AI settings", variant: "destructive" });
    },
  });
}
