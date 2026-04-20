import { describe, it, expect, vi, beforeEach } from "vitest";
import { NavMenusService } from "./nav-menus.service";
import type defaultRepo from "./nav-menus.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

function makeRepo(): Repo {
  return {
    listForTenant: vi.fn(),
    findBySlot: vi.fn(),
    upsert: vi.fn(),
    deleteBySlot: vi.fn(),
  } as unknown as Repo;
}

function makeSites(websiteEnabled = true): SitesRepo {
  return {
    findConfig: vi.fn().mockResolvedValue({ websiteEnabled }),
  } as unknown as SitesRepo;
}

const mockRevalidate = vi.fn().mockResolvedValue(undefined);

function sampleMenu(overrides = {}) {
  return {
    id: "nm1",
    tenantId: "t1",
    slot: "header-primary",
    items: { items: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("NavMenusService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("list", () => {
    it("returns menus for an enabled tenant", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const menus = [sampleMenu()];
      (repo.listForTenant as ReturnType<typeof vi.fn>).mockResolvedValue(menus);
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      const result = await svc.list("t1");

      expect(sites.findConfig).toHaveBeenCalledWith("t1");
      expect(repo.listForTenant).toHaveBeenCalledWith("t1");
      expect(result).toEqual(menus);
    });

    it("throws 403 when website feature is disabled", async () => {
      const repo = makeRepo();
      const sites = makeSites(false);
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      await expect(svc.list("t1")).rejects.toMatchObject({ statusCode: 403 });
      expect(repo.listForTenant).not.toHaveBeenCalled();
    });

    it("throws 403 when site config is null (no website record)", async () => {
      const repo = makeRepo();
      const sites = {
        findConfig: vi.fn().mockResolvedValue(null),
      } as unknown as SitesRepo;
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      await expect(svc.list("t1")).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("getBySlot", () => {
    it("returns the menu for the requested slot", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const menu = sampleMenu({ slot: "footer-1" });
      (repo.findBySlot as ReturnType<typeof vi.fn>).mockResolvedValue(menu);
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      const result = await svc.getBySlot("t1", "footer-1");

      expect(repo.findBySlot).toHaveBeenCalledWith("t1", "footer-1");
      expect(result).toEqual(menu);
    });

    it("returns null when slot has no menu", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.findBySlot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      const result = await svc.getBySlot("t1", "footer-2");

      expect(result).toBeNull();
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new NavMenusService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(svc.getBySlot("t1", "header-primary")).rejects.toMatchObject(
        { statusCode: 403 },
      );
    });
  });

  describe("upsert", () => {
    it("saves and revalidates on success", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      const saved = sampleMenu();
      (repo.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(saved);
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      const result = await svc.upsert("t1", {
        slot: "header-primary",
        items: { items: [] },
      });

      expect(repo.upsert).toHaveBeenCalledWith(
        "t1",
        "header-primary",
        expect.anything(),
      );
      expect(mockRevalidate).toHaveBeenCalledWith("t1", "header-primary");
      expect(result).toEqual(saved);
    });

    it("does NOT revalidate when website feature is disabled", async () => {
      const svc = new NavMenusService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(
        svc.upsert("t1", { slot: "footer-1", items: { items: [] } }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRevalidate).not.toHaveBeenCalled();
    });
  });

  describe("deleteBySlot", () => {
    it("deletes and revalidates when menu exists", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.deleteBySlot as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      await svc.deleteBySlot("t1", "footer-1");

      expect(repo.deleteBySlot).toHaveBeenCalledWith("t1", "footer-1");
      expect(mockRevalidate).toHaveBeenCalledWith("t1", "footer-1");
    });

    it("throws 404 when no rows were deleted", async () => {
      const repo = makeRepo();
      const sites = makeSites(true);
      (repo.deleteBySlot as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      const svc = new NavMenusService(repo, sites, mockRevalidate);

      await expect(svc.deleteBySlot("t1", "footer-1")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("throws 403 when website feature is disabled", async () => {
      const svc = new NavMenusService(
        makeRepo(),
        makeSites(false),
        mockRevalidate,
      );
      await expect(svc.deleteBySlot("t1", "footer-1")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
