import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { BlogService } from "./blog.service";
import type defaultRepo from "./blog.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

const mockRepo = {
  listPosts: vi.fn(),
  getPostById: vi.fn(),
  findPostBySlug: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  listCategories: vi.fn(),
  getCategoryById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
} as unknown as Repo;

const mockSites = {
  findConfig: vi.fn(),
} as unknown as SitesRepo;

const mockRevalidate = vi.fn().mockResolvedValue(undefined);
const service = new BlogService(mockRepo, mockSites, mockRevalidate);

function siteConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: "tpl1",
    branding: null,
    contact: null,
    features: null,
    seo: null,
    isPublished: true,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    template: null,
    ...overrides,
  };
}

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

function post(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    tenantId: "t1",
    slug: "hello",
    title: "Hello",
    excerpt: null,
    bodyMarkdown: "# Hello",
    heroImageUrl: null,
    authorName: null,
    status: "DRAFT" as const,
    publishedAt: null,
    categoryId: null,
    tags: [],
    seoTitle: null,
    seoDescription: null,
    readingMinutes: 1,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    category: null,
    ...overrides,
  };
}

describe("BlogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("feature-flag gating", () => {
    it("throws 403 when tenant has no SiteConfig", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.listPosts("t1", { page: 1, limit: 10 }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("throws 403 when websiteEnabled is false", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig({ websiteEnabled: false }),
      );
      await expect(
        service.listPosts("t1", { page: 1, limit: 10 }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("listPosts", () => {
    it("returns paginated result", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (mockRepo.listPosts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [post()],
        1,
      ]);

      const result = await service.listPosts("t1", {
        page: 1,
        limit: 20,
        status: "DRAFT",
      });

      expect(result).toEqual({ posts: [post()], total: 1, page: 1, limit: 20 });
      expect(mockRepo.listPosts).toHaveBeenCalledWith("t1", {
        page: 1,
        limit: 20,
        status: "DRAFT",
        categoryId: undefined,
        search: undefined,
      });
    });
  });

  describe("createPost", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("creates a post and fires revalidation", async () => {
      (mockRepo.createPost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ slug: "new-post" }),
      );

      await service.createPost("t1", {
        slug: "new-post",
        title: "New",
        bodyMarkdown: "Hello world",
        tags: [],
      });

      expect(mockRepo.createPost).toHaveBeenCalled();
      const [, data] = (mockRepo.createPost as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.slug).toBe("new-post");
      expect(data.readingMinutes).toBe(1);
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "new-post" });
    });

    it("validates category belongs to tenant", async () => {
      (mockRepo.getCategoryById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(
        service.createPost("t1", {
          slug: "new-post",
          title: "New",
          bodyMarkdown: "body",
          categoryId: "cat-does-not-exist",
          tags: [],
        }),
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mockRepo.createPost).not.toHaveBeenCalled();
    });

    it("computes reading time for a large body (10K+ chars)", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      const longBody = "word ".repeat(3000); // ~3000 words ≈ 12-15 min
      (mockRepo.createPost as ReturnType<typeof vi.fn>).mockImplementation(
        (_tenantId: string, data: Record<string, unknown>) => ({
          ...post({ bodyMarkdown: longBody }),
          readingMinutes: data.readingMinutes,
        }),
      );
      await service.createPost("t1", {
        title: "Long article",
        slug: "long-article",
        bodyMarkdown: longBody,
      });
      expect(mockRepo.createPost).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          readingMinutes: expect.any(Number),
        }),
      );
      const call = (mockRepo.createPost as ReturnType<typeof vi.fn>).mock
        .calls[0]!;
      const minutes = (call[1] as Record<string, unknown>)
        .readingMinutes as number;
      expect(minutes).toBeGreaterThan(10);
    });

    it("maps Prisma P2002 to 409 Conflict", async () => {
      const err = new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      (mockRepo.createPost as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      await expect(
        service.createPost("t1", {
          slug: "dup",
          title: "Dup",
          bodyMarkdown: "body",
          tags: [],
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("updatePost", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("404s when post doesn't exist", async () => {
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(
        service.updatePost("t1", "missing", { title: "x" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("re-computes readingMinutes when body changes", async () => {
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post(),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ bodyMarkdown: "new body" }),
      );

      await service.updatePost("t1", "p1", {
        bodyMarkdown: "word ".repeat(400),
      });

      const [, , data] = (mockRepo.updatePost as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.readingMinutes).toBe(2);
    });

    it("revalidates both old and new slugs on slug change", async () => {
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ slug: "old" }),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ slug: "new" }),
      );

      await service.updatePost("t1", "p1", { slug: "new" });

      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "new" });
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "old" });
    });
  });

  describe("publishPost", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("sets publishedAt on first publish", async () => {
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ publishedAt: null }),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ status: "PUBLISHED" }),
      );

      await service.publishPost("t1", "p1");

      const [, , data] = (mockRepo.updatePost as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.status).toBe("PUBLISHED");
      expect(data.publishedAt).toBeInstanceOf(Date);
    });

    it("preserves publishedAt on republish", async () => {
      const originalDate = new Date("2026-01-01");
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ publishedAt: originalDate }),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ status: "PUBLISHED" }),
      );

      await service.publishPost("t1", "p1");

      const [, , data] = (mockRepo.updatePost as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.publishedAt).toBeUndefined();
    });

    it("preserves publishedAt across unpublish and republish", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      const originalDate = new Date("2026-01-15T10:00:00Z");
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ status: "DRAFT", publishedAt: originalDate }),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockImplementation(
        (_tenantId: string, _id: string, data: Record<string, unknown>) => ({
          ...post({
            status: "PUBLISHED",
            publishedAt: data.publishedAt ?? originalDate,
          }),
        }),
      );
      await service.publishPost("t1", "p1");
      // The service should NOT overwrite an existing publishedAt
      expect(mockRepo.updatePost).toHaveBeenCalledWith(
        "t1",
        "p1",
        expect.not.objectContaining({ publishedAt: expect.any(Date) }),
      );
    });
  });

  describe("unpublishPost", () => {
    it("sets status back to DRAFT", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ status: "PUBLISHED" }),
      );
      (mockRepo.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post({ status: "DRAFT" }),
      );

      await service.unpublishPost("t1", "p1");

      const [, , data] = (mockRepo.updatePost as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.status).toBe("DRAFT");
    });
  });

  describe("deletePost", () => {
    it("404s when not found", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.deletePost("t1", "missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("deletes and revalidates", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (mockRepo.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(
        post(),
      );
      (mockRepo.deletePost as ReturnType<typeof vi.fn>).mockResolvedValue(
        post(),
      );

      await service.deletePost("t1", "p1");

      expect(mockRepo.deletePost).toHaveBeenCalledWith("t1", "p1");
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "hello" });
    });
  });

  describe("categories", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("creates a category and revalidates", async () => {
      (mockRepo.createCategory as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "c1",
        slug: "stories",
        name: "Stories",
      });

      await service.createCategory("t1", { slug: "stories", name: "Stories" });

      expect(mockRepo.createCategory).toHaveBeenCalledWith("t1", {
        slug: "stories",
        name: "Stories",
        description: null,
        sortOrder: 0,
      });
      expect(mockRevalidate).toHaveBeenCalledWith("t1");
    });

    it("maps category slug conflict to 409", async () => {
      const err = new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      (mockRepo.createCategory as ReturnType<typeof vi.fn>).mockRejectedValue(
        err,
      );

      await expect(
        service.createCategory("t1", { slug: "dup", name: "Dup" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("404s on update when category missing", async () => {
      (mockRepo.getCategoryById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.updateCategory("t1", "missing", { name: "x" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("deletes and revalidates", async () => {
      (mockRepo.getCategoryById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "c1",
        tenantId: "t1",
        slug: "stories",
        name: "Stories",
      });
      (mockRepo.deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "c1",
      });

      await service.deleteCategory("t1", "c1");

      expect(mockRepo.deleteCategory).toHaveBeenCalledWith("t1", "c1");
      expect(mockRevalidate).toHaveBeenCalledWith("t1");
    });
  });
});
