import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { PagesService } from "./pages.service";
import type defaultRepo from "./pages.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

const mockRepo = {
  listPages: vi.fn(),
  getPageById: vi.fn(),
  findPageBySlug: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
  reorderPages: vi.fn(),
} as unknown as Repo;

const mockSites = {
  findConfig: vi.fn(),
} as unknown as SitesRepo;

const mockRevalidate = vi.fn().mockResolvedValue(undefined);
const service = new PagesService(mockRepo, mockSites, mockRevalidate);

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
    createdAt: new Date(),
    updatedAt: new Date(),
    template: null,
    ...overrides,
  };
}

function page(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    tenantId: "t1",
    slug: "about",
    title: "About",
    bodyMarkdown: "# About",
    layoutVariant: "default",
    showInNav: true,
    navOrder: 0,
    isPublished: false,
    seoTitle: null,
    seoDescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PagesService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("feature gate", () => {
    it("403s when SiteConfig is missing", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.listPages("t1", { page: 1, limit: 50 }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("403s when websiteEnabled is false", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig({ websiteEnabled: false }),
      );
      await expect(
        service.listPages("t1", { page: 1, limit: 50 }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("listPages", () => {
    it("returns paginated results", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (mockRepo.listPages as ReturnType<typeof vi.fn>).mockResolvedValue([
        [page()],
        1,
      ]);

      const result = await service.listPages("t1", {
        page: 1,
        limit: 50,
      });
      expect(result.total).toBe(1);
      expect(result.pages).toHaveLength(1);
    });
  });

  describe("createPage", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("creates a page and fires revalidation", async () => {
      (mockRepo.createPage as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ slug: "about" }),
      );

      await service.createPage("t1", {
        slug: "about",
        title: "About",
        bodyMarkdown: "body",
        layoutVariant: "default",
        showInNav: true,
        navOrder: 0,
      });

      expect(mockRepo.createPage).toHaveBeenCalled();
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "about" });
    });

    it("maps P2002 to 409", async () => {
      const err = new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      (mockRepo.createPage as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      await expect(
        service.createPage("t1", {
          slug: "dup",
          title: "Dup",
          bodyMarkdown: "body",
          layoutVariant: "default",
          showInNav: true,
          navOrder: 0,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("updatePage", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("404s when page missing", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.updatePage("t1", "missing", { title: "x" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("revalidates both old and new slugs on rename", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ slug: "old" }),
      );
      (mockRepo.updatePage as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ slug: "new" }),
      );

      await service.updatePage("t1", "p1", { slug: "new" });
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "new" });
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "old" });
    });
  });

  describe("publishPage / unpublishPage / deletePage", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("publish sets isPublished=true", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        page(),
      );
      (mockRepo.updatePage as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ isPublished: true }),
      );
      await service.publishPage("t1", "p1");
      const [, , data] = (mockRepo.updatePage as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.isPublished).toBe(true);
    });

    it("unpublish sets isPublished=false", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ isPublished: true }),
      );
      (mockRepo.updatePage as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ isPublished: false }),
      );
      await service.unpublishPage("t1", "p1");
      const [, , data] = (mockRepo.updatePage as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.isPublished).toBe(false);
    });

    it("delete 404s when missing", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.deletePage("t1", "missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("delete revalidates the old slug", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        page({ slug: "about" }),
      );
      await service.deletePage("t1", "p1");
      expect(mockRepo.deletePage).toHaveBeenCalledWith("t1", "p1");
      expect(mockRevalidate).toHaveBeenCalledWith("t1", { slug: "about" });
    });
  });

  describe("reorder", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
    });

    it("no-ops on empty list", async () => {
      await service.reorder("t1", { order: [] });
      expect(mockRepo.reorderPages).not.toHaveBeenCalled();
    });

    it("404s if any id doesn't belong to tenant", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(page({ id: "p1" }))
        .mockResolvedValueOnce(null);

      await expect(
        service.reorder("t1", {
          order: [
            { id: "p1", navOrder: 0 },
            { id: "p2", navOrder: 1 },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("delegates and revalidates on success", async () => {
      (mockRepo.getPageById as ReturnType<typeof vi.fn>).mockResolvedValue(
        page(),
      );
      await service.reorder("t1", {
        order: [{ id: "p1", navOrder: 0 }],
      });
      expect(mockRepo.reorderPages).toHaveBeenCalled();
      expect(mockRevalidate).toHaveBeenCalledWith("t1");
    });
  });
});
