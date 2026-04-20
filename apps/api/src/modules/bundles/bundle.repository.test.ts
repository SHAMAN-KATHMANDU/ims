import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockProductFindMany = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    bundle: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    product: {
      findMany: (...a: unknown[]) => mockProductFindMany(...a),
    },
  },
}));

import bundleRepository from "./bundle.repository";

describe("BundleRepository", () => {
  const tenantId = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany uses select (no include of full rows)", async () => {
    mockFindMany.mockResolvedValue([]);
    await bundleRepository.findMany(
      { tenantId, deletedAt: null },
      { createdAt: "desc" },
      0,
      10,
    );
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.select).toBeDefined();
    expect(arg.include).toBeUndefined();
    expect(arg.select.description).toBeUndefined();
  });

  it("findFirstBySlug trims and lowercases", async () => {
    mockFindFirst.mockResolvedValue(null);
    await bundleRepository.findFirstBySlug(tenantId, "  Pack-One  ");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          slug: "pack-one",
          deletedAt: null,
        }),
      }),
    );
  });

  it("findFirstBySlug returns null for empty slug", async () => {
    const r = await bundleRepository.findFirstBySlug(tenantId, "   ");
    expect(r).toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("findActiveBySlug filters active=true", async () => {
    mockFindFirst.mockResolvedValue(null);
    await bundleRepository.findActiveBySlug(tenantId, "pack");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          slug: "pack",
          active: true,
          deletedAt: null,
        }),
      }),
    );
  });

  it("softDelete sets active=false + deletedAt", async () => {
    mockUpdate.mockResolvedValue({});
    await bundleRepository.softDelete("b1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: expect.objectContaining({ active: false }),
      }),
    );
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.deletedAt).toBeInstanceOf(Date);
  });

  it("dereferenceProducts preserves input order and drops missing", async () => {
    mockProductFindMany.mockResolvedValue([
      { id: "p3", name: "Three" },
      { id: "p1", name: "One" },
    ]);
    const r = await bundleRepository.dereferenceProducts(tenantId, [
      "p1",
      "p2",
      "p3",
    ]);
    expect(r.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("dereferenceProducts short-circuits on empty array", async () => {
    const r = await bundleRepository.dereferenceProducts(tenantId, []);
    expect(r).toEqual([]);
    expect(mockProductFindMany).not.toHaveBeenCalled();
  });
});
