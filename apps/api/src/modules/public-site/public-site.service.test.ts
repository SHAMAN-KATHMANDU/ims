import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicSiteService } from "./public-site.service";
import type defaultRepo from "./public-site.repository";
import type defaultCollectionsRepo from "@/modules/collections/collections.repository";
import type defaultPromoRepo from "@/modules/promos/promo.repository";

type Repo = typeof defaultRepo;
type CollectionsRepo = typeof defaultCollectionsRepo;
type PromoRepo = typeof defaultPromoRepo;

const mockRepo = {
  findSiteConfig: vi.fn(),
  listProducts: vi.fn(),
  findProduct: vi.fn(),
  listCategories: vi.fn(),
  findProductIdForTenant: vi.fn(),
  listFrequentlyBoughtWith: vi.fn(),
} as unknown as Repo;

const mockCollectionsRepo = {
  list: vi.fn(),
  findBySlug: vi.fn(),
} as unknown as CollectionsRepo;

const mockPromoRepo = {
  count: vi.fn(),
  findMany: vi.fn(),
} as unknown as PromoRepo;

const service = new PublicSiteService(
  mockRepo,
  mockCollectionsRepo,
  mockPromoRepo,
);

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
    locales: ["en", "ne"],
    defaultLocale: "en",
    currency: "NPR",
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

  describe("getSite locale", () => {
    it("returns defaultLocale + locales when both are set", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ locales: ["en", "ne", "hi"], defaultLocale: "ne" }),
      );
      const result = await service.getSite("t1");
      expect(result.locale).toBe("ne");
      expect(result.locales).toEqual(["en", "ne", "hi"]);
    });

    it("falls back to first locale when defaultLocale is null", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ locales: ["ne", "en"], defaultLocale: null }),
      );
      const result = await service.getSite("t1");
      expect(result.locale).toBe("ne");
      expect(result.locales).toEqual(["ne", "en"]);
    });

    it('falls back to "en" when locales empty and defaultLocale null', async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ locales: [], defaultLocale: null }),
      );
      const result = await service.getSite("t1");
      expect(result.locale).toBe("en");
      expect(result.locales).toEqual([]);
    });
  });

  describe("getSite currency", () => {
    it("returns tenant-configured currency when set", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ currency: "INR" }),
      );
      const result = await service.getSite("t1");
      expect(result.currency).toBe("INR");
    });

    it('falls back to "NPR" when currency column is at default', async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ currency: "NPR" }),
      );
      const result = await service.getSite("t1");
      expect(result.currency).toBe("NPR");
    });

    it('falls back to "NPR" when currency is nullish (defensive)', async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ currency: null }),
      );
      const result = await service.getSite("t1");
      expect(result.currency).toBe("NPR");
    });
  });

  describe("listProducts", () => {
    it("returns paginated products when published and omits facets by default", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [{ id: "p1", name: "Chair" }],
        42,
        null,
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
      expect(result.facets).toBeNull();
      expect(mockRepo.listProducts).toHaveBeenCalledWith("t1", {
        page: 2,
        limit: 10,
        categoryId: undefined,
        search: undefined,
        vendorId: undefined,
        attr: undefined,
        includeFacets: false,
      });
    });

    it("passes includeFacets=true through when query opts in", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const facets = {
        brands: [],
        priceMin: null,
        priceMax: null,
        attributes: [],
      };
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
        facets,
      ]);

      const result = await service.listProducts("t1", {
        page: 1,
        limit: 24,
        includeFacets: true,
      });
      expect(result.facets).toEqual(facets);
      expect(mockRepo.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ includeFacets: true }),
      );
    });

    it("treats any non-true includeFacets value as false (Zod transform guarantees boolean)", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
        null,
      ]);

      await service.listProducts("t1", {
        page: 1,
        limit: 24,
        includeFacets: false,
      });
      expect(mockRepo.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ includeFacets: false }),
      );
    });

    it("falls back to defaults when page/limit undefined", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
        null,
      ]);

      const result = await service.listProducts("t1", {});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(24);
      expect(result.facets).toBeNull();
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
        { id: "c1", name: "Chairs", description: null, productCount: 7 },
      ]);

      const result = await service.listCategories("t1");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "c1", productCount: 7 });
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

  describe("listProducts sort forwarding", () => {
    it('forwards sort="best-selling" to repo.listProducts', async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
        null,
      ]);

      await service.listProducts("t1", {
        page: 1,
        limit: 24,
        sort: "best-selling",
      });

      expect(mockRepo.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ sort: "best-selling" }),
      );
    });

    it('forwards sort="newest" unchanged', async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.listProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
        [],
        0,
        null,
      ]);

      await service.listProducts("t1", {
        page: 1,
        limit: 24,
        sort: "newest",
      });

      expect(mockRepo.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ sort: "newest" }),
      );
    });
  });

  describe("listActiveCollections", () => {
    it("returns active collections capped by limit", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockCollectionsRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: "c1",
          slug: "hero",
          title: "Hero",
          subtitle: null,
          isActive: true,
        },
        {
          id: "c2",
          slug: "calm",
          title: "Calm",
          subtitle: "lo",
          isActive: true,
        },
        {
          id: "c3",
          slug: "off",
          title: "Off",
          subtitle: null,
          isActive: false,
        },
      ]);
      const { collections } = await service.listActiveCollections("t1", 4);
      // c3 is filtered (inactive); c1, c2 returned in order
      expect(collections.map((c) => c.id)).toEqual(["c1", "c2"]);
    });

    it("clamps limit between 1 and 24 and defaults to 6", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const many = Array.from({ length: 30 }, (_, i) => ({
        id: `c${i}`,
        slug: `s${i}`,
        title: `T${i}`,
        subtitle: null,
        isActive: true,
      }));
      (mockCollectionsRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        many,
      );

      const overflow = await service.listActiveCollections("t1", 999);
      expect(overflow.collections).toHaveLength(24);

      const negative = await service.listActiveCollections("t1", -5);
      expect(negative.collections).toHaveLength(1);

      const def = await service.listActiveCollections("t1");
      expect(def.collections).toHaveLength(6);
    });

    it("throws 404 when site is not published", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.listActiveCollections("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockCollectionsRepo.list).not.toHaveBeenCalled();
    });
  });

  // Bundle endpoints live in `apps/api/src/modules/bundles/` —
  // public-site no longer owns them. See `bundle.service.test.ts` for
  // the corresponding coverage.

  describe("listFrequentlyBoughtWith", () => {
    it("returns products when published and product exists for tenant", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findProductIdForTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: "p1" });
      (
        mockRepo.listFrequentlyBoughtWith as ReturnType<typeof vi.fn>
      ).mockResolvedValue([{ id: "p2" }, { id: "p3" }]);

      const result = await service.listFrequentlyBoughtWith("t1", "p1");
      expect(result.products).toHaveLength(2);
      expect(mockRepo.listFrequentlyBoughtWith).toHaveBeenCalledWith(
        "t1",
        "p1",
      );
    });

    it("returns empty products when FBT repo returns empty (graceful no-signal)", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findProductIdForTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: "p1" });
      (
        mockRepo.listFrequentlyBoughtWith as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const result = await service.listFrequentlyBoughtWith("t1", "p1");
      expect(result).toEqual({ products: [] });
    });

    it("throws 404 when site not published (before product lookup)", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.listFrequentlyBoughtWith("t1", "p1"),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.findProductIdForTenant).not.toHaveBeenCalled();
      expect(mockRepo.listFrequentlyBoughtWith).not.toHaveBeenCalled();
    });

    it("throws 404 when product not found for tenant (cross-tenant guard)", async () => {
      (mockRepo.findSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findProductIdForTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(
        service.listFrequentlyBoughtWith("t1", "p1"),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.listFrequentlyBoughtWith).not.toHaveBeenCalled();
    });
  });
});
