import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { BlockNode } from "@repo/shared";

export interface BlogPost {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  body: BlockNode[];
  heroImageUrl: string | null;
  coverImageUrl: string | null;
  icon: string | null;
  authorName: string | null;
  categoryId: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  scheduledPublishAt: string | null;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BlogCategory {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostData {
  slug: string;
  title: string;
  excerpt?: string | null;
  bodyMarkdown?: string;
  body?: BlockNode[];
  scheduledPublishAt?: string | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  icon?: string | null;
  authorName?: string | null;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdateBlogPostData {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  bodyMarkdown?: string;
  body?: BlockNode[];
  scheduledPublishAt?: string | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  icon?: string | null;
  authorName?: string | null;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CreateBlogCategoryData {
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateBlogCategoryData {
  slug?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

export interface BlogPostListParams {
  page?: number;
  limit?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string;
  search?: string;
}

export interface BlogPostListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
}

export interface BlogVersion {
  id: string;
  resourceId: string;
  snapshot: Record<string, unknown>;
  editorId: string | null;
  note: string | null;
  createdAt: string;
}

export const blogService = {
  async listPosts(params?: BlogPostListParams): Promise<BlogPostListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.categoryId)
        queryParams.append("categoryId", params.categoryId);
      if (params?.search) queryParams.append("search", params.search);

      const { data } = await api.get<{
        message: string;
        posts: BlogPost[];
        total: number;
        page: number;
        limit: number;
      }>(`/blog/posts?${queryParams.toString()}`);

      return {
        posts: data.posts ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 20,
      };
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async getPost(id: string): Promise<BlogPost> {
    try {
      const { data } = await api.get<{
        message: string;
        post: BlogPost;
      }>(`/blog/posts/${id}`);
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async createPost(payload: CreateBlogPostData): Promise<BlogPost> {
    try {
      const { data } = await api.post<{
        message: string;
        post: BlogPost;
      }>("/blog/posts", payload);
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async updatePost(id: string, payload: UpdateBlogPostData): Promise<BlogPost> {
    try {
      const { data } = await api.patch<{
        message: string;
        post: BlogPost;
      }>(`/blog/posts/${id}`, payload);
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async deletePost(id: string): Promise<void> {
    try {
      await api.delete(`/blog/posts/${id}`);
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async publishPost(id: string): Promise<BlogPost> {
    try {
      const { data } = await api.post<{
        message: string;
        post: BlogPost;
      }>(`/blog/posts/${id}/publish`, {});
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async unpublishPost(id: string): Promise<BlogPost> {
    try {
      const { data } = await api.post<{
        message: string;
        post: BlogPost;
      }>(`/blog/posts/${id}/unpublish`, {});
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async listPostVersions(id: string): Promise<BlogVersion[]> {
    try {
      const { data } = await api.get<{
        message: string;
        versions: BlogVersion[];
      }>(`/blog/posts/${id}/versions`);
      return data.versions ?? [];
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async restorePostVersion(id: string, versionId: string): Promise<BlogPost> {
    try {
      const { data } = await api.post<{
        message: string;
        post: BlogPost;
      }>(`/blog/posts/${id}/versions/${versionId}/restore`, {});
      return data.post;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  // Categories
  async listCategories(): Promise<BlogCategory[]> {
    try {
      const { data } = await api.get<{
        message: string;
        categories: BlogCategory[];
      }>("/blog/categories");
      return data.categories ?? [];
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async createCategory(payload: CreateBlogCategoryData): Promise<BlogCategory> {
    try {
      const { data } = await api.post<{
        message: string;
        category: BlogCategory;
      }>("/blog/categories", payload);
      return data.category;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async updateCategory(
    id: string,
    payload: UpdateBlogCategoryData,
  ): Promise<BlogCategory> {
    try {
      const { data } = await api.patch<{
        message: string;
        category: BlogCategory;
      }>(`/blog/categories/${id}`, payload);
      return data.category;
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`/blog/categories/${id}`);
    } catch (error) {
      throw handleApiError(error, "blog");
    }
  },
};
