"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  pagesService,
  type CreatePageData,
  type UpdatePageData,
  type PageListParams,
} from "../services/pages.service";

export type {
  TenantPage,
  PageListResponse,
  PageVersion,
} from "../services/pages.service";

export const pageKeys = {
  all: ["pages"] as const,
  lists: () => [...pageKeys.all, "list"] as const,
  list: (params: PageListParams) => [...pageKeys.lists(), params] as const,
  details: () => [...pageKeys.all, "detail"] as const,
  detail: (id: string) => [...pageKeys.details(), id] as const,
  versions: (id: string) => [...pageKeys.detail(id), "versions"] as const,
};

export function usePagesQuery(params?: PageListParams) {
  return useQuery({
    queryKey: pageKeys.list(params ?? {}),
    queryFn: () => pagesService.listPages(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePageQuery(id: string) {
  return useQuery({
    queryKey: pageKeys.detail(id),
    queryFn: () => pagesService.getPage(id),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreatePageData) => pagesService.createPage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      toast({ title: "Page created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePageData }) =>
      pagesService.updatePage(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      qc.invalidateQueries({ queryKey: pageKeys.detail(id) });
      toast({ title: "Page updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => pagesService.deletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      toast({ title: "Page deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePublishPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => pagesService.publishPage(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      qc.invalidateQueries({ queryKey: pageKeys.detail(id) });
      toast({ title: "Page published" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnpublishPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => pagesService.unpublishPage(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      qc.invalidateQueries({ queryKey: pageKeys.detail(id) });
      toast({ title: "Page unpublished" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unpublish page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDuplicatePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => pagesService.duplicatePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.lists() });
      toast({ title: "Page duplicated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to duplicate page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePageVersions(id: string) {
  return useQuery({
    queryKey: pageKeys.versions(id),
    queryFn: () => pagesService.listVersions(id),
    enabled: !!id,
  });
}

export function useRestorePageVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      pageId,
      versionId,
    }: {
      pageId: string;
      versionId: string;
    }) => pagesService.restoreVersion(pageId, versionId),
    onSuccess: (_, { pageId }) => {
      qc.invalidateQueries({ queryKey: pageKeys.detail(pageId) });
      qc.invalidateQueries({ queryKey: pageKeys.versions(pageId) });
      toast({ title: "Version restored" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to restore version",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConvertPageToBlocks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => pagesService.convertToBlocks(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: pageKeys.detail(id) });
      toast({ title: "Page converted to blocks" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to convert page",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGetPagePreviewUrl() {
  return useMutation({
    mutationFn: (id: string) => pagesService.getPreviewUrl(id),
    onError: (error: Error) => {
      console.error("Failed to get preview URL:", error.message);
    },
  });
}
