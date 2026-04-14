import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicBlogService } from "./public-blog.service";
import type defaultRepo from "./public-blog.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

const mockRepo = {
  findCategoryBySlug: vi.fn(),
  listPosts: vi.fn(),
  findPostBySlug: vi.fn(),
  findRelatedPosts: vi.fn(),
  listFeatured: vi.fn(),
  listCategoriesWithCounts: vi.fn(),
} as unknown as Repo;

const mockSites = {
  findConfig: vi.fn(),
} as unknown as SitesRepo;

const service = new PublicBlogService(mockRepo, mockSites);

function published() {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    isPublished: true,
    templateId: "tpl1",
    branding: null,
    contact: null,
    features: null,
    seo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: null,
  };
}

describe("PublicBlogService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("ensurePublished gate", () => {
    it("404s when SiteConfig missing", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.listPosts("t1", { page: 1, limit: 12 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("404s when not websiteEnabled", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...published(),
        websiteEnabled: false,
      });
      await expect(
        service.listPosts("t1", { page: 1, limit: 12 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("404s when not isPublished", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...published(),
        isPublished: false,
      });
      await expect(
        service.listPosts("t1", { page: 1, limit: 12 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("listPosts", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
    });

    it("resolves categorySlug to categoryId", async () => {
      (
        mockRepo.findCategoryBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: "c1", tenantId: "t1", slug: "stories" });
      (mockRepo.listPosts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
      ]);

      await service.listPosts("t1", {
        page: 1,
        limit: 12,
        categorySlug: "stories",
      });

      expect(mockRepo.listPosts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ categoryId: "c1" }),
      );
    });

    it("404s unknown categorySlug", async () => {
      (
        mockRepo.findCategoryBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(
        service.listPosts("t1", {
          page: 1,
          limit: 12,
          categorySlug: "ghost",
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("passes tag filter through", async () => {
      (mockRepo.listPosts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
      ]);
      await service.listPosts("t1", { page: 1, limit: 12, tag: "welcome" });
      expect(mockRepo.listPosts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ tag: "welcome" }),
      );
    });
  });

  describe("getPostBySlug", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
    });

    it("returns post + related", async () => {
      (mockRepo.findPostBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1",
        slug: "welcome",
        category: { id: "c1", slug: "stories", name: "Stories" },
      });
      (mockRepo.findRelatedPosts as ReturnType<typeof vi.fn>).mockResolvedValue(
        [{ id: "p2" }],
      );

      const result = await service.getPostBySlug("t1", "welcome");

      expect(result.post.id).toBe("p1");
      expect(result.related).toHaveLength(1);
      expect(mockRepo.findRelatedPosts).toHaveBeenCalledWith("t1", {
        categoryId: "c1",
        excludeId: "p1",
        limit: 3,
      });
    });

    it("404s unknown slug (no existence leak)", async () => {
      (mockRepo.findPostBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(
        service.getPostBySlug("t1", "missing"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("listFeatured", () => {
    it("delegates with limit", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
      (mockRepo.listFeatured as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await service.listFeatured("t1", { limit: 5 });
      expect(mockRepo.listFeatured).toHaveBeenCalledWith("t1", 5);
    });
  });

  describe("listCategories", () => {
    it("delegates to repo", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
      (
        mockRepo.listCategoriesWithCounts as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      await service.listCategories("t1");
      expect(mockRepo.listCategoriesWithCounts).toHaveBeenCalledWith("t1");
    });
  });
});
