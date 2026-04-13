import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicSiteService } from "./public-site.service";
import type defaultRepo from "./public-site.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findSiteConfig: vi.fn(),
  listProducts: vi.fn(),
  findProduct: vi.fn(),
  listCategories: vi.fn(),
} as unknown as Repo;

const service = new PublicSiteService(mockRepo);

function config(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: "tpl1",
    branding: { theme: "light" },
    contact: { email: "a@b.c" },
    features: { hero: true },
    seo: { title: "Home" },
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: {
      id: "tpl1",
      slug: "minimal",
      name: "Minimal",
      description: null,
      tier: "MINIMAL",
      previewImageUrl: null,
      defaultBranding: null,
      defaultSections: null,
      isActive: true,
      sortOrder: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

describe("PublicSiteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensurePublished guard (via getSite)", () => {
    it("returns site when published & enabled", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const result = await service.getSite("t1");
      expect(result.branding).toEqual({ theme: "light" });
      expect(result.template?.slug).toBe("minimal");
    });

    it("throws 404 when SiteConfig missing", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.getSite("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when websiteEnabled is false", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(service.getSite("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when isPublished is false", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ isPublished: false }),
      );
      await expect(service.getSite("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("listProducts", () => {
    it("returns paginated products when published", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [{ id: "p1", name: "Chair" }],
        42,
      ]);

      const result = await service.listProducts("t1", {
        page: 2,
        limit: 10,
        categoryId: undefined,
        search: undefined,
      });
      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(mockRepo.listProducts).toHaveBeenCalledWith("t1", {
        page: 2,
        limit: 10,
        categoryId: undefined,
        search: undefined,
      });
    });

    it("falls back to defaults when page/limit undefined", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
      ]);

      const result = await service.listProducts("t1", {});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(24);
    });

    it("throws 404 when not published", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ isPublished: false }),
      );
      await expect(
        service.listProducts("t1", { page: 1, limit: 10 }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.listProducts).not.toHaveBeenCalled();
    });
  });

  describe("getProduct", () => {
    it("returns product when found", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.findProduct as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1",
        name: "Chair",
      });
      const result = await service.getProduct("t1", "p1");
      expect(result.id).toBe("p1");
    });

    it("throws 404 when product missing", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.findProduct as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.getProduct("t1", "missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when not published (before product lookup)", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.getProduct("t1", "p1")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.findProduct).not.toHaveBeenCalled();
    });
  });

  describe("listCategories", () => {
    it("returns categories when published", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listCategories as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "c1", name: "Chairs" },
      ]);

      const result = await service.listCategories("t1");
      expect(result).toHaveLength(1);
    });

    it("throws 404 when not published", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.listCategories("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
