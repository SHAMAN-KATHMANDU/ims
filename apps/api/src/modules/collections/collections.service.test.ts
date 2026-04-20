import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/sites/sites.repository", () => ({
  default: {
    findConfig: vi.fn(),
  },
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import sitesRepo from "@/modules/sites/sites.repository";
import { CollectionsService } from "./collections.service";

type CollectionRow = {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  sort: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const mockRepo = {
  list: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setProducts: vi.fn(),
  listProductIds: vi.fn(),
};

function row(overrides: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: "c1",
    tenantId: "t1",
    slug: "featured",
    title: "Featured",
    subtitle: null,
    sort: 10,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

const enabledConfig = { websiteEnabled: true };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const service = new CollectionsService(mockRepo as any);
const findConfig = sitesRepo.findConfig as unknown as ReturnType<typeof vi.fn>;

describe("CollectionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertEnabled gate", () => {
    it("throws 403 when SiteConfig is missing", async () => {
      findConfig.mockResolvedValue(null);
      await expect(service.list("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockRepo.list).not.toHaveBeenCalled();
    });

    it("throws 403 when websiteEnabled is false", async () => {
      findConfig.mockResolvedValue({ websiteEnabled: false });
      await expect(service.list("t1")).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockRepo.list).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("returns rows with productCount when collections exist", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.list.mockResolvedValue([row({ id: "c1" }), row({ id: "c2" })]);
      mockRepo.listProductIds.mockResolvedValueOnce(["p1", "p2"]);
      mockRepo.listProductIds.mockResolvedValueOnce([]);

      const result = await service.list("t1");

      expect(result).toHaveLength(2);
      expect(result[0]?.productCount).toBe(2);
      expect(result[1]?.productCount).toBe(0);
    });

    it("seeds the default trio on first visit then returns them", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.list.mockResolvedValueOnce([]);
      mockRepo.list.mockResolvedValueOnce([]);
      mockRepo.create.mockResolvedValue(row());
      mockRepo.list.mockResolvedValueOnce([
        row({ id: "c1", slug: "featured", title: "Featured" }),
        row({ id: "c2", slug: "exclusives", title: "Exclusives" }),
        row({ id: "c3", slug: "top-picks", title: "Top Picks" }),
      ]);
      mockRepo.listProductIds.mockResolvedValue([]);

      const result = await service.list("t1");

      expect(mockRepo.create).toHaveBeenCalledTimes(3);
      expect(mockRepo.create.mock.calls.map((c) => c[1].slug)).toEqual([
        "featured",
        "exclusives",
        "top-picks",
      ]);
      expect(result).toHaveLength(3);
    });
  });

  describe("get", () => {
    it("returns row + productIds on success", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1" }));
      mockRepo.listProductIds.mockResolvedValue(["p1", "p2"]);

      const result = await service.get("t1", "c1");

      expect(result.id).toBe("c1");
      expect(result.productIds).toEqual(["p1", "p2"]);
    });

    it("throws 404 when collection missing", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.get("t1", "missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("create", () => {
    it("creates when slug is unused", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findBySlug.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(row());

      const result = await service.create("t1", {
        slug: "featured",
        title: "Featured",
      });

      expect(mockRepo.create).toHaveBeenCalledWith("t1", {
        slug: "featured",
        title: "Featured",
      });
      expect(result.slug).toBe("featured");
    });

    it("forwards optional fields only when defined", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findBySlug.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(row());

      await service.create("t1", {
        slug: "featured",
        title: "Featured",
        subtitle: "hand-picked",
        sort: 50,
        isActive: false,
      });

      expect(mockRepo.create).toHaveBeenCalledWith("t1", {
        slug: "featured",
        title: "Featured",
        subtitle: "hand-picked",
        sort: 50,
        isActive: false,
      });
    });

    it("throws 409 when slug already exists", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findBySlug.mockResolvedValue(row({ id: "existing" }));

      await expect(
        service.create("t1", { slug: "featured", title: "Featured" }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("throws 404 when collection missing", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update("t1", "missing", { title: "New" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 when renamed slug clashes with a different collection", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1", slug: "featured" }));
      mockRepo.findBySlug.mockResolvedValue(row({ id: "c2", slug: "hot" }));

      await expect(
        service.update("t1", "c1", { slug: "hot" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("allows keeping the same slug without a clash check collision", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1", slug: "featured" }));
      mockRepo.update.mockResolvedValue(row({ id: "c1", title: "Renamed" }));

      await service.update("t1", "c1", {
        slug: "featured",
        title: "Renamed",
      });

      expect(mockRepo.findBySlug).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it("normalizes nullable subtitle to null on the repo call", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1" }));
      mockRepo.update.mockResolvedValue(row());

      await service.update("t1", "c1", { subtitle: null });

      expect(mockRepo.update).toHaveBeenCalledWith("t1", "c1", {
        subtitle: null,
      });
    });
  });

  describe("remove", () => {
    it("throws 404 when missing", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove("t1", "missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("delegates to repo.delete on success", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1" }));
      mockRepo.delete.mockResolvedValue(undefined);
      await service.remove("t1", "c1");
      expect(mockRepo.delete).toHaveBeenCalledWith("t1", "c1");
    });
  });

  describe("setProducts", () => {
    it("throws 404 when collection missing", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(null);
      await expect(
        service.setProducts("t1", "missing", ["p1"]),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("passes productIds through and returns accepted/skipped", async () => {
      findConfig.mockResolvedValue(enabledConfig);
      mockRepo.findById.mockResolvedValue(row({ id: "c1" }));
      mockRepo.setProducts.mockResolvedValue({
        accepted: ["p1"],
        skipped: ["bad"],
      });

      const result = await service.setProducts("t1", "c1", ["p1", "bad"]);

      expect(mockRepo.setProducts).toHaveBeenCalledWith("t1", "c1", [
        "p1",
        "bad",
      ]);
      expect(result).toEqual({ accepted: ["p1"], skipped: ["bad"] });
    });
  });

  describe("ensureDefaults", () => {
    it("creates missing defaults and skips already-present slugs", async () => {
      mockRepo.list.mockResolvedValue([
        row({ id: "c1", slug: "featured", title: "Featured" }),
      ]);
      mockRepo.create.mockResolvedValue(row());

      await service.ensureDefaults("t1");

      expect(mockRepo.create).toHaveBeenCalledTimes(2);
      const createdSlugs = mockRepo.create.mock.calls.map((c) => c[1].slug);
      expect(createdSlugs).toEqual(["exclusives", "top-picks"]);
    });

    it("swallows create failures to stay race-safe", async () => {
      mockRepo.list.mockResolvedValue([]);
      mockRepo.create.mockRejectedValue(new Error("unique constraint"));
      await expect(service.ensureDefaults("t1")).resolves.toBeUndefined();
    });
  });
});
