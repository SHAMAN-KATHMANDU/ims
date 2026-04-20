import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteLayoutsService } from "./site-layouts.service";
import type defaultRepo from "./site-layouts.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

function makeRepo(): Repo {
  return {
    findByKey: vi.fn(),
    listForTenant: vi.fn(),
    upsertDraft: vi.fn(),
    publishDraft: vi.fn(),
    deleteByKey: vi.fn(),
  } as unknown as Repo;
}

function makeSites(websiteEnabled = true, templateSlug = "minimal"): SitesRepo {
  return {
    findConfig: vi.fn().mockResolvedValue({
      websiteEnabled,
      template: templateSlug ? { slug: templateSlug } : null,
    }),
  } as unknown as SitesRepo;
}

const mockRevalidate = vi.fn().mockResolvedValue(undefined);

function sampleLayout(overrides = {}) {
  return {
    id: "sl1",
    tenantId: "t1",
    scope: "home",
    pageId: null,
    blocks: [],
    draftBlocks: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const minimalInput = {
  scope: "home" as const,
  pageId: null,
  blocks: [] as never[],
};

describe("SiteLayoutsService", () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  describe("list", () => {
    it("returns layouts for an enabled tenant", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const layouts = [sampleLayout()];
      (repo.listForTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
        layouts,
      );
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      const result = await svc.list("t1");

      expect(sites.findConfig).toHaveBeenCalledWith("t1");
      expect(repo.listForTenant).toHaveBeenCalledWith("t1", {});
      expect(result).toEqual(layouts);
    });

    it("passes scope filter through to repository", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.listForTenant as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      await svc.list("t1", { scope: "home" });

      expect(repo.listForTenant).toHaveBeenCalledWith("t1", { scope: "home" });
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(svc.list("t1")).rejects.toMatchObject({ statusCode: 403 });
    });

    it("throws 403 when config is null", async () => {
      const sites = {
        findConfig: vi.fn().mockResolvedValue(null),
      } as unknown as SitesRepo;
      const svc = new SiteLayoutsService(makeRepo(), sites, mockRevalidate);
      await expect(svc.list("t1")).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // -------------------------------------------------------------------------
  describe("get", () => {
    it("returns layout when found", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const layout = sampleLayout();
      (repo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(layout);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      const result = await svc.get("t1", { scope: "home" });

      expect(repo.findByKey).toHaveBeenCalledWith("t1", { scope: "home" });
      expect(result).toEqual(layout);
    });

    it("throws 404 when layout not found", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      await expect(svc.get("t1", { scope: "home" })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(svc.get("t1", { scope: "home" })).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("upsertDraft", () => {
    it("saves draft and revalidates", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const layout = sampleLayout({ draftBlocks: [] });
      (repo.upsertDraft as ReturnType<typeof vi.fn>).mockResolvedValue(layout);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      const result = await svc.upsertDraft("t1", minimalInput);

      expect(repo.upsertDraft).toHaveBeenCalledWith(
        "t1",
        { scope: "home", pageId: null },
        expect.anything(),
      );
      expect(mockRevalidate).toHaveBeenCalledWith("t1", "home");
      expect(result).toEqual(layout);
    });

    it("throws 400 for an invalid block tree", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(true),
        mockRevalidate,
      );
      await expect(
        svc.upsertDraft("t1", {
          scope: "home",
          pageId: null,
          blocks: "not a block tree" as never,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(svc.upsertDraft("t1", minimalInput)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("publishDraft", () => {
    it("publishes and revalidates", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const layout = sampleLayout({ version: 2 });
      (repo.publishDraft as ReturnType<typeof vi.fn>).mockResolvedValue(layout);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      const result = await svc.publishDraft("t1", { scope: "home" });

      expect(repo.publishDraft).toHaveBeenCalledWith("t1", { scope: "home" });
      expect(mockRevalidate).toHaveBeenCalledWith("t1", "home");
      expect(result).toEqual(layout);
    });

    it("throws 404 when no draft exists", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.publishDraft as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      await expect(
        svc.publishDraft("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(
        svc.publishDraft("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteLayout", () => {
    it("deletes and revalidates when row exists", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.deleteByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      await svc.deleteLayout("t1", { scope: "home" });

      expect(repo.deleteByKey).toHaveBeenCalledWith("t1", { scope: "home" });
      expect(mockRevalidate).toHaveBeenCalledWith("t1", "home");
    });

    it("throws 404 when nothing was deleted", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.deleteByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      const svc = new SiteLayoutsService(repo, sites, mockRevalidate);

      await expect(
        svc.deleteLayout("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new SiteLayoutsService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(
        svc.deleteLayout("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // -------------------------------------------------------------------------
  describe("resetScopeFromTemplate", () => {
    it("throws 400 when tenant has no template picked", async () => {
      const sites = {
        findConfig: vi
          .fn()
          .mockResolvedValue({ websiteEnabled: true, template: null }),
      } as unknown as SitesRepo;
      const svc = new SiteLayoutsService(makeRepo(), sites, mockRevalidate);

      await expect(
        svc.resetScopeFromTemplate("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 404 when template has no blueprint registered", async () => {
      const sites = {
        findConfig: vi.fn().mockResolvedValue({
          websiteEnabled: true,
          template: { slug: "nonexistent-template-xyz" },
        }),
      } as unknown as SitesRepo;
      const svc = new SiteLayoutsService(makeRepo(), sites, mockRevalidate);

      await expect(
        svc.resetScopeFromTemplate("t1", { scope: "home" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
