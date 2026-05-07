/**
 * Media library dock query hook.
 * Lists media assets + upload + delete.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  listMediaAssets,
  registerMediaAsset,
  deleteMediaAsset,
  updateMediaAsset,
  type MediaAssetRow,
  type PresignResponse,
  type MediaPurpose,
} from "@/features/media/services/media.service";
import { presignMedia } from "@/features/media/services/media.service";

export type { MediaAssetRow, PresignResponse };

export const mediaKeys = {
  all: ["media"] as const,
  assets: () => [...mediaKeys.all, "assets"] as const,
  asset: (id: string) => [...mediaKeys.assets(), id] as const,
};

export function useMediaAssets(params?: {
  limit?: number;
  cursor?: string;
  purpose?: MediaPurpose;
  mimePrefix?: string;
}) {
  return useQuery({
    queryKey: mediaKeys.assets(),
    queryFn: () =>
      listMediaAssets({
        limit: params?.limit ?? 50,
        cursor: params?.cursor,
        purpose: params?.purpose,
        mimePrefix: params?.mimePrefix,
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePresignMedia() {
  return useMutation({
    mutationFn: presignMedia,
  });
}

export function useRegisterMediaAsset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: registerMediaAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.assets() });
      toast({ title: "Asset uploaded" });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMediaAsset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.assets() });
      toast({ title: "Asset deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMediaAsset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fileName: string } }) =>
      updateMediaAsset(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: mediaKeys.assets() });
      qc.invalidateQueries({ queryKey: mediaKeys.asset(id) });
      toast({ title: "Asset updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
