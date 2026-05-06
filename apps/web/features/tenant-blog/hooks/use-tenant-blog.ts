"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  deleteBlogPost,
  listBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  listBlogPostVersions,
  restoreBlogPostVersion,
  type ListBlogPostsQuery,
  type CreateBlogPostData,
  type UpdateBlogPostData,
  type CreateBlogCategoryData,
  type UpdateBlogCategoryData,
} from "../services/tenant-blog.service";

export const tenantBlogKeys = {
  all: ["tenant-blog"] as const,
  posts: (query?: ListBlogPostsQuery) =>
    [...tenantBlogKeys.all, "posts", query ?? {}] as const,
  post: (id: string) => [...tenantBlogKeys.all, "post", id] as const,
  categories: () => [...tenantBlogKeys.all, "categories"] as const,
  versions: (id: string) => [...tenantBlogKeys.all, "versions", id] as const,
};

// ==================== POSTS ====================

export function useBlogPosts(query: ListBlogPostsQuery = {}) {
  return useQuery({
    queryKey: tenantBlogKeys.posts(query),
    queryFn: () => listBlogPosts(query),
    retry: false,
  });
}

export function useBlogPost(id: string | null) {
  return useQuery({
    queryKey: tenantBlogKeys.post(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Post id is required");
      return getBlogPost(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlogPostData) => createBlogPost(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPostData }) =>
      updateBlogPost(id, data),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
      qc.setQueryData(tenantBlogKeys.post(post.id), post);
    },
  });
}

export function usePublishBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishBlogPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

export function useUnpublishBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unpublishBlogPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

// ==================== VERSIONS ====================

export function useBlogPostVersions(id: string | null) {
  return useQuery({
    queryKey: tenantBlogKeys.versions(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Post id is required");
      return listBlogPostVersions(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useRestoreBlogPostVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      restoreBlogPostVersion(id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

// ==================== CATEGORIES ====================

export function useBlogCategories() {
  return useQuery({
    queryKey: tenantBlogKeys.categories(),
    queryFn: listBlogCategories,
    retry: false,
  });
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlogCategoryData) => createBlogCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.categories() });
    },
  });
}

export function useUpdateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogCategoryData }) =>
      updateBlogCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.categories() });
    },
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.categories() });
    },
  });
}

// ==================== REVIEW WORKFLOW (Phase 6) ====================

import {
  requestBlogReview,
  approveBlogReview,
  rejectBlogReview,
} from "../services/tenant-blog.service";

export function useRequestBlogReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestBlogReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

export function useApproveBlogReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveBlogReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}

export function useRejectBlogReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectBlogReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantBlogKeys.all });
    },
  });
}
