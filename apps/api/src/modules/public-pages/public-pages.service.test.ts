import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicPagesService } from "./public-pages.service";
import type defaultRepo from "./public-pages.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

const mockRepo = {
  findPageBySlug: vi.fn(),
  listPages: vi.fn(),
} as unknown as Repo;

const mockSites = {
  findConfig: vi.fn(),
} as unknown as SitesRepo;

const service = new PublicPagesService(mockRepo, mockSites);

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

describe("PublicPagesService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("ensurePublished", () => {
    it("404s when SiteConfig missing", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.getPageBySlug("t1", "about")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("404s when not websiteEnabled", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...published(),
        websiteEnabled: false,
      });
      await expect(service.getPageBySlug("t1", "about")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("404s when not isPublished", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...published(),
        isPublished: false,
      });
      await expect(service.getPageBySlug("t1", "about")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("getPageBySlug", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
    });

    it("404s unknown slug (no existence leak)", async () => {
      (mockRepo.findPageBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.getPageBySlug("t1", "missing"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns the page when found", async () => {
      (mockRepo.findPageBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1",
        slug: "about",
        title: "About",
        bodyMarkdown: "# Hi",
        layoutVariant: "default",
        seoTitle: null,
        seoDescription: null,
        updatedAt: new Date(),
      });
      const result = await service.getPageBySlug("t1", "about");
      expect(result.slug).toBe("about");
    });
  });

  describe("listPages", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        published(),
      );
    });

    it("passes navOnly=true when query.nav is true", async () => {
      (mockRepo.listPages as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await service.listPages("t1", { nav: true });
      expect(mockRepo.listPages).toHaveBeenCalledWith("t1", { navOnly: true });
    });

    it("passes navOnly=false by default", async () => {
      (mockRepo.listPages as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await service.listPages("t1", {});
      expect(mockRepo.listPages).toHaveBeenCalledWith("t1", {
        navOnly: false,
      });
    });
  });
});
