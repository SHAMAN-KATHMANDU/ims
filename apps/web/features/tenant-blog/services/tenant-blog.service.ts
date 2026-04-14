/**
 * Tenant Blog Service — tenant-scoped endpoints under /blog/*.
 * Available to admin / superAdmin after the platform has enabled the
 * website feature.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

// ============================================
// Types
// ============================================

export type BlogPostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface BlogCategory {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
}

export interface BlogPostListItem {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  authorName: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  categoryId: string | null;
  tags: string[];
  readingMinutes: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; slug: string; name: string } | null;
}

export interface BlogPost extends BlogPostListItem {
  bodyMarkdown: string;
}

export interface CreateBlogPostData {
  slug: string;
  title: string;
  excerpt?: string | null;
  bodyMarkdown: string;
  heroImageUrl?: string | null;
  authorName?: string | null;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export type UpdateBlogPostData = Partial<CreateBlogPostData>;

export interface ListBlogPostsQuery {
  page?: number;
  limit?: number;
  status?: BlogPostStatus;
  categoryId?: string;
  search?: string;
}

export interface BlogPostList {
  posts: BlogPostListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateBlogCategoryData {
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export type UpdateBlogCategoryData = Partial<CreateBlogCategoryData>;

// ============================================
// API — Posts
// ============================================

export async function listBlogPosts(
  query: ListBlogPostsQuery = {},
): Promise<BlogPostList> {
  try {
    const response = await api.get<BlogPostList>("/blog/posts", {
      params: query,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "list blog posts");
  }
}

export async function getBlogPost(id: string): Promise<BlogPost> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.get<{ post: BlogPost }>(`/blog/posts/${id}`);
    return response.data.post;
  } catch (error) {
    handleApiError(error, "fetch blog post");
  }
}

export async function createBlogPost(
  data: CreateBlogPostData,
): Promise<BlogPost> {
  try {
    const response = await api.post<{ post: BlogPost }>("/blog/posts", data);
    return response.data.post;
  } catch (error) {
    handleApiError(error, "create blog post");
  }
}

export async function updateBlogPost(
  id: string,
  data: UpdateBlogPostData,
): Promise<BlogPost> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.patch<{ post: BlogPost }>(
      `/blog/posts/${id}`,
      data,
    );
    return response.data.post;
  } catch (error) {
    handleApiError(error, "update blog post");
  }
}

export async function publishBlogPost(id: string): Promise<BlogPost> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.post<{ post: BlogPost }>(
      `/blog/posts/${id}/publish`,
      {},
    );
    return response.data.post;
  } catch (error) {
    handleApiError(error, "publish blog post");
  }
}

export async function unpublishBlogPost(id: string): Promise<BlogPost> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.post<{ post: BlogPost }>(
      `/blog/posts/${id}/unpublish`,
      {},
    );
    return response.data.post;
  } catch (error) {
    handleApiError(error, "unpublish blog post");
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  if (!id) throw new Error("Post id is required");
  try {
    await api.delete(`/blog/posts/${id}`);
  } catch (error) {
    handleApiError(error, "delete blog post");
  }
}

// ============================================
// API — Categories
// ============================================

export async function listBlogCategories(): Promise<BlogCategory[]> {
  try {
    const response = await api.get<{ categories: BlogCategory[] }>(
      "/blog/categories",
    );
    return response.data.categories ?? [];
  } catch (error) {
    handleApiError(error, "list blog categories");
  }
}

export async function createBlogCategory(
  data: CreateBlogCategoryData,
): Promise<BlogCategory> {
  try {
    const response = await api.post<{ category: BlogCategory }>(
      "/blog/categories",
      data,
    );
    return response.data.category;
  } catch (error) {
    handleApiError(error, "create blog category");
  }
}

export async function updateBlogCategory(
  id: string,
  data: UpdateBlogCategoryData,
): Promise<BlogCategory> {
  if (!id) throw new Error("Category id is required");
  try {
    const response = await api.patch<{ category: BlogCategory }>(
      `/blog/categories/${id}`,
      data,
    );
    return response.data.category;
  } catch (error) {
    handleApiError(error, "update blog category");
  }
}

export async function deleteBlogCategory(id: string): Promise<void> {
  if (!id) throw new Error("Category id is required");
  try {
    await api.delete(`/blog/categories/${id}`);
  } catch (error) {
    handleApiError(error, "delete blog category");
  }
}
