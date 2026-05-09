"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { navigationService } from "./navigation.service";
import type { NavigationConfig } from "./types";
import { useToast } from "@/hooks/useToast";
import { useCallback, useRef } from "react";

const navigationKeys = {
  all: ["navigation"] as const,
  config: () => [...navigationKeys.all, "config"] as const,
};

export function useNavigationConfig() {
  return useQuery({
    queryKey: navigationKeys.config(),
    queryFn: () => navigationService.getNavigation(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNavigation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (navigation: NavigationConfig) =>
      navigationService.updateNavigation(navigation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: navigationKeys.config() });
      toast({ title: "Navigation saved" });
    },
    onError: (error) => {
      toast({
        title: "Failed to save navigation",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });
}

// Debounced save hook
export function useDebouncedNavigationSave() {
  const mutation = useUpdateNavigation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(
    (navigation: NavigationConfig) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        mutation.mutate(navigation);
      }, 1000);
    },
    [mutation],
  );

  return { debouncedSave, isPending: mutation.isPending };
}
