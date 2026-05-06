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

/** Phase 6 review-workflow state (only meaningful when CMS_REVIEW_WORKFLOW is on). */
export type ContentReviewStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED";

export interface BlogPostListItem {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  /** Phase 8 — Notion-style cover image (full-bleed above title). */
  coverImageUrl?: string | null;
  /** Phase 8 — emoji or short string rendered before the heading. */
  icon?: string | null;
  authorName: string | null;
  status: BlogPostStatus;
  /** Phase 6: review state, independent of `status`. Defaults to DRAFT for legacy rows. */
  reviewStatus?: ContentReviewStatus;
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
  /** Block tree body (Phase 2). Empty array on legacy / freshly-migrated posts. */
  body?: BlockNodeJson[];
  /** Phase 4: ISO-8601 timestamp of a scheduled auto-publish; null = none. */
  scheduledPublishAt?: string | null;
}

/**
 * BlockNode is structurally a `{ id, kind, props, children?, … }` JSON
 * value — the API doesn't validate the per-kind props strictly when
 * incoming, only that the tree shape conforms. We type it loosely on the
 * client side (the canonical typed version lives in `@repo/shared`).
 */
export type BlockNodeJson = {
  id: string;
  kind: string;
  props: unknown;
  children?: BlockNodeJson[];
};

export interface CreateBlogPostData {
  slug: string;
  title: string;
  excerpt?: string | null;
  /**
   * Markdown body. Either bodyMarkdown or body must be set; the API
   * accepts both shapes and derives the other server-side.
   */
  bodyMarkdown?: string;
  /** Block tree body — preferred when authoring through the CMS editor. */
  body?: BlockNodeJson[];
  /** Phase 4: when set + status is DRAFT, the worker auto-publishes at this time. */
  scheduledPublishAt?: string | null;
  heroImageUrl?: string | null;
  /** Phase 8 — Notion-style cover image. */
  coverImageUrl?: string | null;
  /** Phase 8 — emoji or short string. */
  icon?: string | null;
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
// API — Versions (Phase 4)
// ============================================

export interface BlogPostVersionListItem {
  id: string;
  createdAt: string;
  editorId: string | null;
  note: string | null;
}

export async function listBlogPostVersions(
  id: string,
): Promise<BlogPostVersionListItem[]> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.get<{ versions: BlogPostVersionListItem[] }>(
      `/blog/posts/${id}/versions`,
    );
    return response.data.versions ?? [];
  } catch (error) {
    handleApiError(error, "list blog post versions");
  }
}

export async function restoreBlogPostVersion(
  id: string,
  versionId: string,
): Promise<BlogPost> {
  if (!id || !versionId) throw new Error("Post id and version id are required");
  try {
    const response = await api.post<{ post: BlogPost }>(
      `/blog/posts/${id}/versions/${versionId}/restore`,
    );
    return response.data.post;
  } catch (error) {
    handleApiError(error, "restore blog post version");
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

// ============================================
// API — Review workflow (Phase 6, behind CMS_REVIEW_WORKFLOW)
// ============================================

export async function requestBlogReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/blog/posts/${id}/review/request`);
    return response.data;
  } catch (error) {
    handleApiError(error, "request blog review");
  }
}

export async function approveBlogReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/blog/posts/${id}/review/approve`);
    return response.data;
  } catch (error) {
    handleApiError(error, "approve blog post");
  }
}

export async function rejectBlogReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Post id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/blog/posts/${id}/review/reject`);
    return response.data;
  } catch (error) {
    handleApiError(error, "reject blog post");
  }
}
