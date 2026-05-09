"use client";

import { useQueries } from "@tanstack/react-query";
import { pagesService } from "../services/pages.service";
import { blogService } from "../services/blog.service";
import { mediaService } from "../services/media.service";
import { collectionsService } from "../services/collections.service";

export interface SidebarCounts {
  pages: number;
  blog: number;
  blocks: number;
  snippets: number;
  media: number;
  collections: number;
  offers: number;
  forms: number;
}

export function useSidebarCounts() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["sidebar-counts", "pages"],
        queryFn: async () => {
          const response = await pagesService.listPages({
            limit: 1,
            page: 1,
          });
          return response.total ?? 0;
        },
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["sidebar-counts", "blog"],
        queryFn: async () => {
          const response = await blogService.listPosts({
            limit: 1,
            page: 1,
          });
          return response.total ?? 0;
        },
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["sidebar-counts", "media"],
        queryFn: async () => {
          const response = await mediaService.listAssets({
            limit: 1,
          });
          return response.items?.length ?? 0;
        },
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["sidebar-counts", "collections"],
        queryFn: async () => {
          const collections = await collectionsService.list();
          return collections.length;
        },
        staleTime: 60 * 1000,
      },
      // TODO: add snippets, offers, forms counts when their services are available
      // For now, return placeholder 0 values
      {
        queryKey: ["sidebar-counts", "blocks"],
        queryFn: async () => 0,
        staleTime: Infinity,
      },
      {
        queryKey: ["sidebar-counts", "snippets"],
        queryFn: async () => 0,
        staleTime: Infinity,
      },
      {
        queryKey: ["sidebar-counts", "offers"],
        queryFn: async () => 0,
        staleTime: Infinity,
      },
      {
        queryKey: ["sidebar-counts", "forms"],
        queryFn: async () => 0,
        staleTime: Infinity,
      },
    ],
  });

  const counts: SidebarCounts = {
    pages: results[0]?.data ?? 0,
    blog: results[1]?.data ?? 0,
    media: results[2]?.data ?? 0,
    collections: results[3]?.data ?? 0,
    blocks: results[4]?.data ?? 0,
    snippets: results[5]?.data ?? 0,
    offers: results[6]?.data ?? 0,
    forms: results[7]?.data ?? 0,
  };

  const isLoading = results.some((r) => r.isPending);
  const error = results.find((r) => r.error)?.error;

  return { ...counts, isLoading, error };
}
