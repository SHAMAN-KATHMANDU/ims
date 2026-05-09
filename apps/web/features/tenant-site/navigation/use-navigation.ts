"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { navigationService } from "./navigation.service";
import type { NavigationData } from "./types";

export const navigationKeys = {
  all: ["navigation"] as const,
  data: () => [...navigationKeys.all, "data"] as const,
};

export function useNavigation() {
  return useQuery({
    queryKey: navigationKeys.data(),
    queryFn: navigationService.get,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNavigation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: NavigationData) => navigationService.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: navigationKeys.data() });
      toast({ title: "Navigation saved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save navigation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
