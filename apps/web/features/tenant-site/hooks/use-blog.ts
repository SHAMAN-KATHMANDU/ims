"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  blogService,
  type CreateBlogPostData,
  type UpdateBlogPostData,
  type CreateBlogCategoryData,
  type UpdateBlogCategoryData,
  type BlogPostListParams,
} from "../services/blog.service";

export type {
  BlogPost,
  BlogCategory,
  BlogPostListResponse,
  BlogVersion,
} from "../services/blog.service";

export const blogKeys = {
  all: ["blog"] as const,
  posts: () => [...blogKeys.all, "posts"] as const,
  postLists: () => [...blogKeys.posts(), "list"] as const,
  postList: (params: BlogPostListParams) =>
    [...blogKeys.postLists(), params] as const,
  postDetails: () => [...blogKeys.posts(), "detail"] as const,
  postDetail: (id: string) => [...blogKeys.postDetails(), id] as const,
  postVersions: (id: string) =>
    [...blogKeys.postDetail(id), "versions"] as const,
  categories: () => [...blogKeys.all, "categories"] as const,
  categoryList: () => [...blogKeys.categories(), "list"] as const,
};

// Posts
export function useBlogPostsQuery(params?: BlogPostListParams) {
  return useQuery({
    queryKey: blogKeys.postList(params ?? {}),
    queryFn: () => blogService.listPosts(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBlogPostQuery(id: string) {
  return useQuery({
    queryKey: blogKeys.postDetail(id),
    queryFn: () => blogService.getPost(id),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateBlogPostData) =>
      blogService.createPost(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.postLists() });
      toast({ title: "Blog post created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create blog post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBlogPostData;
    }) => blogService.updatePost(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: blogKeys.postLists() });
      qc.invalidateQueries({ queryKey: blogKeys.postDetail(id) });
      toast({ title: "Blog post updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update blog post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => blogService.deletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.postLists() });
      toast({ title: "Blog post deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete blog post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePublishBlogPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => blogService.publishPost(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: blogKeys.postLists() });
      qc.invalidateQueries({ queryKey: blogKeys.postDetail(id) });
      toast({ title: "Blog post published" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish blog post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnpublishBlogPost() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => blogService.unpublishPost(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: blogKeys.postLists() });
      qc.invalidateQueries({ queryKey: blogKeys.postDetail(id) });
      toast({ title: "Blog post unpublished" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unpublish blog post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBlogPostVersions(id: string) {
  return useQuery({
    queryKey: blogKeys.postVersions(id),
    queryFn: () => blogService.listPostVersions(id),
    enabled: !!id,
  });
}

export function useRestoreBlogPostVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      postId,
      versionId,
    }: {
      postId: string;
      versionId: string;
    }) => blogService.restorePostVersion(postId, versionId),
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: blogKeys.postDetail(postId) });
      qc.invalidateQueries({ queryKey: blogKeys.postVersions(postId) });
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

// Categories
export function useBlogCategoriesQuery() {
  return useQuery({
    queryKey: blogKeys.categoryList(),
    queryFn: () => blogService.listCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateBlogCategoryData) =>
      blogService.createCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.categoryList() });
      toast({ title: "Category created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBlogCategory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBlogCategoryData;
    }) => blogService.updateCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.categoryList() });
      toast({ title: "Category updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => blogService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blogKeys.categoryList() });
      toast({ title: "Category deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
