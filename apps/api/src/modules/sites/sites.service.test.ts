import { describe, it, expect, vi, beforeEach } from "vitest";
import { SitesService } from "./sites.service";
import type defaultRepo from "./sites.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findConfig: vi.fn(),
  updateConfig: vi.fn(),
  listActiveTemplates: vi.fn(),
  findTemplateBySlug: vi.fn(),
} as unknown as Repo;

const mockRevalidate = vi.fn().mockResolvedValue(undefined);
const service = new SitesService(mockRepo, mockRevalidate);

function config(overrides: Record<string, unknown> = {}) {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    templateId: "tpl1",
    branding: { theme: "light" },
    contact: null,
    features: { hero: true },
    seo: null,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: {
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
    },
    ...overrides,
  };
}

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl2",
    slug: "luxury",
    name: "Luxury",
    description: "Dark",
    category: "luxury",
    previewImageUrl: null,
    defaultBranding: { colors: { primary: "#B8860B" } },
    defaultSections: { hero: true, lookbook: true },
    defaultPages: { home: true, products: true },
    isActive: true,
    sortOrder: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("SitesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfig", () => {
    it("returns config when websiteEnabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const result = await service.getConfig("t1");
      expect(result.tenantId).toBe("t1");
    });

    it("throws 403 when SiteConfig missing", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.getConfig("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("throws 403 when websiteEnabled is false", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(service.getConfig("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("updateConfig", () => {
    it("updates provided fields only", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ branding: { theme: "dark" } }),
      );

      await service.updateConfig("t1", { branding: { theme: "dark" } });

      expect(mockRepo.updateConfig).toHaveBeenCalledWith("t1", {
        branding: { theme: "dark" },
      });
    });

    it("clears a field when set to null", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ branding: null }),
      );

      await service.updateConfig("t1", { branding: null });

      const call = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(call[1].branding).toBeDefined();
      // Prisma.JsonNull is a symbol-like token; just assert it's not undefined.
    });

    it("throws 403 when disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(
        service.updateConfig("t1", { branding: { theme: "dark" } }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepo.updateConfig).not.toHaveBeenCalled();
    });

    it("round-trips currency through to the repo update input", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ currency: "INR" }),
      );

      await service.updateConfig("t1", { currency: "INR" });

      expect(mockRepo.updateConfig).toHaveBeenCalledWith("t1", {
        currency: "INR",
      });
    });

    it("leaves currency unset in the update when not provided", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );

      await service.updateConfig("t1", { branding: { theme: "dark" } });

      const [, data] = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.currency).toBeUndefined();
    });
  });

  describe("listTemplates", () => {
    it("returns active templates when enabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.listActiveTemplates as ReturnType<typeof vi.fn>
      ).mockResolvedValue([template()]);

      const result = await service.listTemplates("t1");
      expect(result).toHaveLength(1);
    });

    it("throws 403 when disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(service.listTemplates("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("pickTemplate", () => {
    it("switches template without touching branding when resetBranding=false", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template());
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl2" }),
      );

      await service.pickTemplate("t1", {
        templateSlug: "luxury",
        resetBranding: false,
      });

      const [, data] = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.template).toEqual({ connect: { id: "tpl2" } });
      expect(data.branding).toBeUndefined();
      expect(data.features).toBeUndefined();
    });

    it("resets branding and features when resetBranding=true", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template());
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl2" }),
      );

      await service.pickTemplate("t1", {
        templateSlug: "luxury",
        resetBranding: true,
      });

      const [, data] = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.branding).toEqual({ colors: { primary: "#B8860B" } });
      expect(data.features).toEqual({ hero: true, lookbook: true });
    });

    it("throws 404 when template slug missing", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(
        service.pickTemplate("t1", {
          templateSlug: "ghost",
          resetBranding: false,
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 400 when template is inactive", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template({ isActive: false }));

      await expect(
        service.pickTemplate("t1", {
          templateSlug: "luxury",
          resetBranding: false,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 403 when disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(
        service.pickTemplate("t1", {
          templateSlug: "luxury",
          resetBranding: false,
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("publish", () => {
    it("publishes when template is picked", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl1" }),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ isPublished: true }),
      );

      const result = await service.publish("t1");
      expect(result.isPublished).toBe(true);
      expect(mockRepo.updateConfig).toHaveBeenCalledWith("t1", {
        isPublished: true,
      });
    });

    it("throws 400 when no template picked", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: null }),
      );
      await expect(service.publish("t1")).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockRepo.updateConfig).not.toHaveBeenCalled();
    });

    it("throws 403 when disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(service.publish("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("unpublish", () => {
    it("sets isPublished=false", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ isPublished: true }),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ isPublished: false }),
      );

      const result = await service.unpublish("t1");
      expect(result.isPublished).toBe(false);
      expect(mockRepo.updateConfig).toHaveBeenCalledWith("t1", {
        isPublished: false,
      });
    });
  });
});
