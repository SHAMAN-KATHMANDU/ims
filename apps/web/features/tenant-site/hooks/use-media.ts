"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  mediaService,
  type MediaListParams,
  type PresignPayload,
  type UploadProgress,
} from "../services/media.service";

export type { UploadProgress } from "../services/media.service";

export const mediaKeys = {
  all: ["media"] as const,
  list: (params?: MediaListParams) =>
    [...mediaKeys.all, "list", params] as const,
  asset: (id: string) => [...mediaKeys.all, "asset", id] as const,
  folders: () => [...mediaKeys.all, "folders"] as const,
};

export function useMediaList(params?: MediaListParams) {
  return useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => mediaService.listAssets(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMediaAsset(id: string | null) {
  return useQuery({
    queryKey: mediaKeys.asset(id ?? ""),
    queryFn: () => mediaService.getAsset(id!),
    enabled: !!id,
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      purpose,
      onProgress,
      entityType,
      entityId,
    }: {
      file: File;
      purpose: PresignPayload["purpose"];
      onProgress?: (progress: UploadProgress) => void;
      entityType?: PresignPayload["entityType"];
      entityId?: string;
    }) =>
      mediaService.uploadFile(file, purpose, onProgress, entityType, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.list() });
      toast({ title: "File uploaded successfully" });
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

export function useUpdateMediaAsset() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      fileName,
      altText,
      folder,
    }: {
      id: string;
      fileName?: string;
      altText?: string | null;
      folder?: string | null;
    }) => mediaService.updateAsset(id, { fileName, altText, folder }),
    onSuccess: (_, { id, folder }) => {
      qc.invalidateQueries({ queryKey: mediaKeys.list() });
      qc.invalidateQueries({ queryKey: mediaKeys.asset(id) });
      if (folder !== undefined) {
        qc.invalidateQueries({ queryKey: mediaKeys.folders() });
      }
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

export function useMediaFolders() {
  return useQuery({
    queryKey: mediaKeys.folders(),
    queryFn: () => mediaService.listFolders(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteMediaAsset() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => mediaService.deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.list() });
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
