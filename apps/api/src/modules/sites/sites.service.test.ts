import { describe, it, expect, vi, beforeEach } from "vitest";
import { SitesService } from "./sites.service";
import type defaultRepo from "./sites.repository";

type Repo = typeof defaultRepo;

const mockRepo = {
  findConfig: vi.fn(),
  updateConfig: vi.fn(),
  upsertConfig: vi.fn(),
  listActiveTemplates: vi.fn(),
  findTemplateBySlug: vi.fn(),
  findTenantForkOfTemplate: vi.fn(),
  publishAllDrafts: vi.fn(),
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
    vi.restoreAllMocks();
  });

  describe("getConfig", () => {
    it("returns config when websiteEnabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const result = await service.getConfig("t1");
      expect(result.tenantId).toBe("t1");
    });

    it("auto-creates SiteConfig when missing, with default theme tokens", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockRepo.upsertConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config(),
      );
      const result = await service.getConfig("t1");
      expect(result.websiteEnabled).toBe(true);
      expect(mockRepo.upsertConfig).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          websiteEnabled: true,
          // themeTokens seed prevents the editor's Design tab and the public
          // tenant-site renderer from rendering against null tokens.
          themeTokens: expect.objectContaining({
            mode: expect.any(String),
            colors: expect.any(Object),
            typography: expect.any(Object),
          }),
        }),
      );
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

    it("throws 403 when websiteEnabled is false", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
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
      (
        mockRepo.findTenantForkOfTemplate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl2" }),
      );

      // Mock the private seeding methods to avoid DB calls
      vi.spyOn(service as any, "seedLayoutsFromBlueprint").mockResolvedValue(
        undefined,
      );
      vi.spyOn(
        service as any,
        "seedCustomPagesFromBlueprint",
      ).mockResolvedValue(undefined);
      vi.spyOn(service as any, "seedNavigationFromBlueprint").mockResolvedValue(
        undefined,
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
      (
        mockRepo.findTenantForkOfTemplate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl2" }),
      );

      // Mock the private seeding methods to avoid DB calls
      vi.spyOn(service as any, "seedLayoutsFromBlueprint").mockResolvedValue(
        undefined,
      );
      vi.spyOn(
        service as any,
        "seedCustomPagesFromBlueprint",
      ).mockResolvedValue(undefined);
      vi.spyOn(service as any, "seedNavigationFromBlueprint").mockResolvedValue(
        undefined,
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

    it("throws 403 when websiteEnabled is false", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(
        service.pickTemplate("t1", {
          templateSlug: "luxury",
          resetBranding: false,
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("invokes seedNavigationFromBlueprint when blueprint resolves", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: null }),
      );
      (
        mockRepo.findTemplateBySlug as ReturnType<typeof vi.fn>
      ).mockResolvedValue(template({ slug: "maison", id: "tpl-maison" }));
      (
        mockRepo.findTenantForkOfTemplate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl-maison" }),
      );

      vi.spyOn(service as any, "seedLayoutsFromBlueprint").mockResolvedValue(
        undefined,
      );
      vi.spyOn(
        service as any,
        "seedCustomPagesFromBlueprint",
      ).mockResolvedValue(undefined);
      const navSpy = vi
        .spyOn(service as any, "seedNavigationFromBlueprint")
        .mockResolvedValue(undefined);

      await service.pickTemplate("t1", { templateSlug: "maison" });

      expect(navSpy).toHaveBeenCalledTimes(1);
      // (tenantId, blueprint, effectiveReset)
      expect(navSpy.mock.calls[0]?.[0]).toBe("t1");
      // First-apply logic: templateId was null on the config, so
      // effectiveReset should be true even without resetBranding.
      expect(navSpy.mock.calls[0]?.[2]).toBe(true);
    });

    it("seedNavigationFromBlueprint preserves user nav unless overwriteExisting=true", async () => {
      const userNav = {
        primary: [{ id: "user-1", label: "Custom", href: "/custom" }],
        utility: [],
        footer: [],
      };
      // Direct unit test of the private method via service-as-any.
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...config(),
        navigation: userNav,
      });
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockClear();

      // overwriteExisting=false → should leave the user's nav alone.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).seedNavigationFromBlueprint(
        "t1",
        { slug: "maison", layouts: { home: [{ id: "x", kind: "spacer" }] } },
        false,
      );
      const calls = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls;
      const navCall = calls.find(
        ([, data]) => (data as { navigation?: unknown }).navigation,
      );
      expect(navCall).toBeUndefined();
    });

    it("seedNavigationFromBlueprint writes primary nav from PAGE_SCOPES on reset", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...config(),
        navigation: null,
      });
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockClear();

      // Synthetic blueprint with home + products-index + contact populated;
      // offers/cart/blog-index empty so they're skipped.
      const blueprint = {
        slug: "synthetic",
        layouts: {
          home: [{ id: "h", kind: "spacer" }],
          "products-index": [{ id: "p", kind: "spacer" }],
          contact: [{ id: "c", kind: "spacer" }],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).seedNavigationFromBlueprint("t1", blueprint, true);

      const calls = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls;
      const navCall = calls.find(
        ([, data]) => (data as { navigation?: unknown }).navigation,
      );
      expect(navCall).toBeDefined();
      const nav = (
        navCall![1] as {
          navigation: { primary: Array<{ href: string; label: string }> };
        }
      ).navigation;
      expect(nav.primary).toHaveLength(3);
      // Home maps to "/" (the new home slug from PR #528)
      expect(nav.primary.some((item) => item.href === "/")).toBe(true);
      expect(nav.primary.some((item) => item.href === "/products")).toBe(true);
      expect(nav.primary.some((item) => item.href === "/contact")).toBe(true);
    });
  });

  describe("publish", () => {
    it("atomically promotes drafts and flips config when template is picked", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl1" }),
      );
      (mockRepo.publishAllDrafts as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          siteConfig: config({ isPublished: true }),
          promoted: 2,
          wasNoOp: false,
        },
      );

      const result = await service.publish("t1");
      expect(result.isPublished).toBe(true);
      expect(mockRepo.publishAllDrafts).toHaveBeenCalledWith("t1");
    });

    it("returns early on idempotent publish (no drafts, already published)", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl1", isPublished: true }),
      );
      (mockRepo.publishAllDrafts as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          siteConfig: config({ isPublished: true }),
          promoted: 0,
          wasNoOp: true,
        },
      );

      const result = await service.publish("t1");
      expect(result.isPublished).toBe(true);
      expect(mockRepo.publishAllDrafts).toHaveBeenCalledWith("t1");
    });

    it("throws 400 when no template picked", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: null }),
      );
      await expect(service.publish("t1")).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockRepo.publishAllDrafts).not.toHaveBeenCalled();
    });

    it("throws 403 when disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(service.publish("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockRepo.publishAllDrafts).not.toHaveBeenCalled();
    });

    it("rolls back on transaction failure", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ templateId: "tpl1" }),
      );
      (mockRepo.publishAllDrafts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection lost"),
      );

      await expect(service.publish("t1")).rejects.toThrow(
        "Database connection lost",
      );
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

  describe("getAnalytics", () => {
    it("returns analytics object from config", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({
          analytics: { ga4MeasurementId: "G-ABC123", consentMode: "basic" },
        }),
      );
      const result = await service.getAnalytics("t1");
      expect(result).toMatchObject({ ga4MeasurementId: "G-ABC123" });
    });

    it("returns empty object when analytics is null", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ analytics: null }),
      );
      const result = await service.getAnalytics("t1");
      expect(result).toEqual({});
    });

    it("throws 403 when website disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(service.getAnalytics("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("updateAnalytics", () => {
    it("merges new analytics values into existing ones", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({
          analytics: {
            ga4MeasurementId: "G-OLD",
            consentMode: "basic",
          },
        }),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({
          analytics: {
            ga4MeasurementId: "G-NEW",
            consentMode: "basic",
          },
        }),
      );

      const result = await service.updateAnalytics("t1", {
        ga4MeasurementId: "G-NEW",
        consentMode: "basic",
      });

      const [, data] = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.analytics).toMatchObject({ ga4MeasurementId: "G-NEW" });
      expect(result).toMatchObject({ ga4MeasurementId: "G-NEW" });
    });

    it("calls revalidate after updating analytics", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ analytics: {} }),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ analytics: { gtmContainerId: "GTM-XYZ" } }),
      );

      await service.updateAnalytics("t1", { gtmContainerId: "GTM-XYZ" });

      expect(mockRevalidate).toHaveBeenCalledWith("t1");
    });

    it("throws 403 when website disabled", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({ websiteEnabled: false }),
      );
      await expect(
        service.updateAnalytics("t1", { ga4MeasurementId: "G-ABC" }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepo.updateConfig).not.toHaveBeenCalled();
    });

    it("preserves existing fields not included in the update", async () => {
      (mockRepo.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({
          analytics: {
            ga4MeasurementId: "G-OLD",
            gtmContainerId: "GTM-EXISTING",
          },
        }),
      );
      (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        config({
          analytics: {
            ga4MeasurementId: "G-NEW",
            gtmContainerId: "GTM-EXISTING",
          },
        }),
      );

      await service.updateAnalytics("t1", { ga4MeasurementId: "G-NEW" });

      const [, data] = (mockRepo.updateConfig as ReturnType<typeof vi.fn>).mock
        .calls[0];
      // Existing GTM ID must be preserved in the merged update
      expect(data.analytics).toMatchObject({ gtmContainerId: "GTM-EXISTING" });
    });
  });
});
