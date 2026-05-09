"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { mediaService, type ListMediaParams } from "./media.service";

export const mediaKeys = {
  all: ["tenant-site-media"] as const,
  list: (params?: ListMediaParams) =>
    [...mediaKeys.all, "list", params] as const,
  asset: (id: string) => [...mediaKeys.all, "asset", id] as const,
};

export function useMediaList(params?: ListMediaParams) {
  return useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => mediaService.list(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => mediaService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast({ title: "Asset deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { altText?: string; name?: string };
    }) => mediaService.update(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
      qc.invalidateQueries({ queryKey: mediaKeys.asset(id) });
      toast({ title: "Asset updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
