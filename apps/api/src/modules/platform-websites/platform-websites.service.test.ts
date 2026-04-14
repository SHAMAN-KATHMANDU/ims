import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformWebsitesService } from "./platform-websites.service";
import type defaultRepo from "./platform-websites.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  tenantExists: vi.fn(),
  findSiteConfigByTenant: vi.fn(),
  findTemplateBySlug: vi.fn(),
  createSiteConfig: vi.fn(),
  updateSiteConfig: vi.fn(),
  upsertSiteConfig: vi.fn(),
} as unknown as Repo;

const service = new PlatformWebsitesService(mockRepo);

function siteConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: null,
    branding: null,
    contact: null,
    features: null,
    seo: null,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: null,
    ...overrides,
  };
}

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl1",
    slug: "minimal",
    name: "Minimal",
    description: "Clean",
    category: "minimal",
    previewImageUrl: null,
    defaultBranding: { colors: { primary: "#111" } },
    defaultSections: { hero: true },
    defaultPages: { home: true },
    isActive: true,
    sortOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PlatformWebsitesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSiteConfig", () => {
    it("returns config when present", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(siteConfig());

      const result = await service.getSiteConfig("t1");
      expect(result.tenantId).toBe("t1");
    });

    it("throws 404 when tenant missing", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.getSiteConfig("nope")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when tenant exists but no SiteConfig", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(service.getSiteConfig("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("enableWebsite", () => {
    it("enables website without template (first-time)", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (mockRepo.upsertSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig(),
      );
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(siteConfig());

      const result = await service.enableWebsite("t1", {});
      expect(result.websiteEnabled).toBe(true);
      expect(mockRepo.findTemplateBySlug).not.toHaveBeenCalled();
    });

    it("enables website and pre-picks template", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template());
      (mockRepo.upsertSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig({ templateId: "tpl1" }),
      );
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(siteConfig({ templateId: "tpl1" }));

      const result = await service.enableWebsite("t1", {
        templateSlug: "minimal",
      });
      expect(mockRepo.findTemplateBySlug).toHaveBeenCalledWith("minimal");
      expect(result.templateId).toBe("tpl1");
    });

    it("throws 404 when tenant missing", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(service.enableWebsite("nope", {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when template slug missing", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      await expect(
        service.enableWebsite("t1", { templateSlug: "ghost" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.upsertSiteConfig).not.toHaveBeenCalled();
    });

    it("throws 400 when template is inactive", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template({ isActive: false }));
      await expect(
        service.enableWebsite("t1", { templateSlug: "minimal" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("disableWebsite", () => {
    it("sets websiteEnabled=false and isPublished=false", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(siteConfig({ websiteEnabled: true }));
      (mockRepo.updateSiteConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        siteConfig({ websiteEnabled: false, isPublished: false }),
      );
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(
        siteConfig({ websiteEnabled: false, isPublished: false }),
      );

      const result = await service.disableWebsite("t1");
      expect(result.websiteEnabled).toBe(false);
      expect(result.isPublished).toBe(false);
      expect(mockRepo.updateSiteConfig).toHaveBeenCalledWith("t1", {
        websiteEnabled: false,
        isPublished: false,
      });
    });

    it("throws 404 when no SiteConfig exists", async () => {
      (mockRepo.tenantExists as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "t1",
      });
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      await expect(service.disableWebsite("t1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("assertWebsiteEnabled", () => {
    it("resolves when websiteEnabled is true", async () => {
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(siteConfig({ websiteEnabled: true }));
      await expect(service.assertWebsiteEnabled("t1")).resolves.toBeUndefined();
    });

    it("throws 409 when no SiteConfig", async () => {
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      await expect(service.assertWebsiteEnabled("t1")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 409 when websiteEnabled is false", async () => {
      (
        mockRepo.findSiteConfigByTenant as ReturnType<typeof vi.fn>
      ).mockResolvedValue(siteConfig({ websiteEnabled: false }));
      await expect(service.assertWebsiteEnabled("t1")).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });
});
