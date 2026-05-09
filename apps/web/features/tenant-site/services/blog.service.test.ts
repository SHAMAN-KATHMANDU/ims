import { describe, it, expect, vi, beforeEach } from "vitest";
import { blogService } from "./blog.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((error) => {
    throw new Error(error?.response?.data?.message || "API error");
  }),
}));

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

describe("blogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPosts", () => {
    it("returns posts list with pagination on success", async () => {
      const mockResponse = {
        data: {
          message: "OK",
          posts: [
            {
              id: "post1",
              slug: "first-post",
              title: "First Post",
              isPublished: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await blogService.listPosts({ page: 1, limit: 20 });

      expect(result.posts).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        "/blog/posts?page=1&limit=20",
      );
    });

    it("filters posts by status", async () => {
      const mockResponse = {
        data: {
          message: "OK",
          posts: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await blogService.listPosts({ status: "PUBLISHED" });

      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("status=PUBLISHED"),
      );
    });

    it("handles API error on listPosts", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
      vi.mocked(handleApiError).mockImplementation(() => {
        throw new Error("Network error");
      });

      await expect(blogService.listPosts()).rejects.toThrow();
    });
  });

  describe("getPost", () => {
    it("returns a single post by id", async () => {
      const mockPost = { id: "post1", slug: "first-post", title: "First Post" };
      vi.mocked(api.get).mockResolvedValue({
        data: { message: "OK", post: mockPost },
      });

      const result = await blogService.getPost("post1");

      expect(result).toEqual(mockPost);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/blog/posts/post1");
    });
  });

  describe("createPost", () => {
    it("creates a post and returns it", async () => {
      const payload = { slug: "new-post", title: "New Post" };
      const mockPost = { id: "post2", ...payload };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Blog post created", post: mockPost },
      });

      const result = await blogService.createPost(payload);

      expect(result).toEqual(mockPost);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/blog/posts", payload);
    });
  });

  describe("publishPost", () => {
    it("publishes a post", async () => {
      const mockPost = { id: "post1", slug: "first-post", isPublished: true };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Blog post published", post: mockPost },
      });

      const result = await blogService.publishPost("post1");

      expect(result.isPublished).toBe(true);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/blog/posts/post1/publish",
        {},
      );
    });
  });

  describe("deletePost", () => {
    it("deletes a post", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await blogService.deletePost("post1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/blog/posts/post1");
    });
  });

  describe("listCategories", () => {
    it("returns categories list", async () => {
      const mockCategories = [{ id: "cat1", slug: "tech", name: "Technology" }];
      vi.mocked(api.get).mockResolvedValue({
        data: { message: "OK", categories: mockCategories },
      });

      const result = await blogService.listCategories();

      expect(result).toHaveLength(1);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/blog/categories");
    });
  });

  describe("createCategory", () => {
    it("creates a category and returns it", async () => {
      const payload = { slug: "tech", name: "Technology" };
      const mockCategory = { id: "cat1", ...payload };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Category created", category: mockCategory },
      });

      const result = await blogService.createCategory(payload);

      expect(result).toEqual(mockCategory);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/blog/categories",
        payload,
      );
    });
  });
});
