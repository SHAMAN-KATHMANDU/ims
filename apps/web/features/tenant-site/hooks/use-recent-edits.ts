"use client";

import { useQueries } from "@tanstack/react-query";
import { pagesService, type TenantPage } from "../services/pages.service";
import { blogService, type BlogPost } from "../services/blog.service";

export interface RecentEdits {
  recentPages: TenantPage[];
  recentPosts: BlogPost[];
}

export function useRecentEdits(limit: number = 5) {
  const results = useQueries({
    queries: [
      {
        queryKey: ["recent-edits", "pages", limit],
        queryFn: async () => {
          const response = await pagesService.listPages({
            limit,
            page: 1,
          });
          return response.pages ?? [];
        },
        staleTime: 60 * 1000,
      },
      {
        queryKey: ["recent-edits", "blog", limit],
        queryFn: async () => {
          const response = await blogService.listPosts({
            limit,
            page: 1,
          });
          return response.posts ?? [];
        },
        staleTime: 60 * 1000,
      },
    ],
  });

  const recentEdits: RecentEdits = {
    recentPages: results[0]?.data ?? [],
    recentPosts: results[1]?.data ?? [],
  };

  const isLoading = results.some((r) => r.isPending);
  const error = results.find((r) => r.error)?.error;

  return { ...recentEdits, isLoading, error };
}
