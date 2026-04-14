import { describe, it, expect, vi, beforeEach } from "vitest";
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
} from "./tenant-blog.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant-blog.service posts", () => {
  it("listBlogPosts GETs /blog/posts with query params", async () => {
    mockGet.mockResolvedValue({
      data: { posts: [], total: 0, page: 1, limit: 20 },
    });

    await listBlogPosts({ page: 2, status: "PUBLISHED" });

    expect(mockGet).toHaveBeenCalledWith("/blog/posts", {
      params: { page: 2, status: "PUBLISHED" },
    });
  });

  it("getBlogPost GETs /blog/posts/:id", async () => {
    mockGet.mockResolvedValue({ data: { post: { id: "p1" } } });
    const post = await getBlogPost("p1");
    expect(mockGet).toHaveBeenCalledWith("/blog/posts/p1");
    expect(post.id).toBe("p1");
  });

  it("getBlogPost throws when id missing", async () => {
    await expect(getBlogPost("")).rejects.toThrow();
  });

  it("createBlogPost POSTs /blog/posts", async () => {
    mockPost.mockResolvedValue({ data: { post: { id: "p1" } } });
    await createBlogPost({
      slug: "hello",
      title: "Hello",
      bodyMarkdown: "body",
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/blog/posts",
      expect.objectContaining({ slug: "hello" }),
    );
  });

  it("updateBlogPost PATCHes /blog/posts/:id", async () => {
    mockPatch.mockResolvedValue({ data: { post: { id: "p1" } } });
    await updateBlogPost("p1", { title: "New" });
    expect(mockPatch).toHaveBeenCalledWith("/blog/posts/p1", { title: "New" });
  });

  it("publishBlogPost POSTs /blog/posts/:id/publish", async () => {
    mockPost.mockResolvedValue({ data: { post: { id: "p1" } } });
    await publishBlogPost("p1");
    expect(mockPost).toHaveBeenCalledWith("/blog/posts/p1/publish", {});
  });

  it("unpublishBlogPost POSTs /blog/posts/:id/unpublish", async () => {
    mockPost.mockResolvedValue({ data: { post: { id: "p1" } } });
    await unpublishBlogPost("p1");
    expect(mockPost).toHaveBeenCalledWith("/blog/posts/p1/unpublish", {});
  });

  it("deleteBlogPost DELETEs /blog/posts/:id", async () => {
    mockDelete.mockResolvedValue({});
    await deleteBlogPost("p1");
    expect(mockDelete).toHaveBeenCalledWith("/blog/posts/p1");
  });
});

describe("tenant-blog.service categories", () => {
  it("listBlogCategories returns array", async () => {
    mockGet.mockResolvedValue({ data: { categories: [{ id: "c1" }] } });
    const result = await listBlogCategories();
    expect(mockGet).toHaveBeenCalledWith("/blog/categories");
    expect(result).toHaveLength(1);
  });

  it("createBlogCategory POSTs /blog/categories", async () => {
    mockPost.mockResolvedValue({ data: { category: { id: "c1" } } });
    await createBlogCategory({ slug: "stories", name: "Stories" });
    expect(mockPost).toHaveBeenCalledWith("/blog/categories", {
      slug: "stories",
      name: "Stories",
    });
  });

  it("updateBlogCategory PATCHes /blog/categories/:id", async () => {
    mockPatch.mockResolvedValue({ data: { category: { id: "c1" } } });
    await updateBlogCategory("c1", { name: "New Name" });
    expect(mockPatch).toHaveBeenCalledWith("/blog/categories/c1", {
      name: "New Name",
    });
  });

  it("deleteBlogCategory DELETEs /blog/categories/:id", async () => {
    mockDelete.mockResolvedValue({});
    await deleteBlogCategory("c1");
    expect(mockDelete).toHaveBeenCalledWith("/blog/categories/c1");
  });
});
