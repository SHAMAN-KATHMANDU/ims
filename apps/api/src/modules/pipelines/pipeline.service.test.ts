import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockClearDefaultForTenant = vi.fn();
const mockClearDefaultForTenantExcept = vi.fn();
const mockCountDealsInPipeline = vi.fn();
const mockSoftDelete = vi.fn();
const mockGetDefaultStages = vi.fn();

vi.mock("./pipeline.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    clearDefaultForTenant: (...args: unknown[]) =>
      mockClearDefaultForTenant(...args),
    clearDefaultForTenantExcept: (...args: unknown[]) =>
      mockClearDefaultForTenantExcept(...args),
    countDealsInPipeline: (...args: unknown[]) =>
      mockCountDealsInPipeline(...args),
    softDelete: (...args: unknown[]) => mockSoftDelete(...args),
    getDefaultStages: () => mockGetDefaultStages(),
  },
}));

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import pipelineService from "./pipeline.service";

describe("PipelineService", () => {
  const tenantId = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultStages.mockReturnValue([
      { id: "s1", name: "Lead", order: 0, probability: 10 },
      { id: "s2", name: "Won", order: 1, probability: 100 },
    ]);
  });

  describe("create", () => {
    it("creates pipeline with provided stages", async () => {
      const created = { id: "p1", name: "Sales" };
      mockCreate.mockResolvedValue(created);

      const result = await pipelineService.create(tenantId, {
        name: "Sales",
        stages: [
          { id: "s1", name: "Lead", order: 0, probability: 10 },
          { id: "s2", name: "Won", order: 1, probability: 100 },
        ],
      });

      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          name: "Sales",
          stages: expect.any(Array),
          isDefault: false,
        }),
      );
    });

    it("uses default stages when none provided", async () => {
      mockCreate.mockResolvedValue({ id: "p1" });

      await pipelineService.create(tenantId, { name: "Sales" });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stages: [
            { id: "s1", name: "Lead", order: 0, probability: 10 },
            { id: "s2", name: "Won", order: 1, probability: 100 },
          ],
        }),
      );
    });

    it("clears default for tenant when isDefault is true", async () => {
      mockCreate.mockResolvedValue({ id: "p1" });

      await pipelineService.create(tenantId, {
        name: "Sales",
        isDefault: true,
      });

      expect(mockClearDefaultForTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  describe("getAll", () => {
    it("returns all pipelines", async () => {
      const pipelines = [{ id: "p1", name: "Sales" }];
      mockFindAll.mockResolvedValue(pipelines);

      const result = await pipelineService.getAll(tenantId);

      expect(result).toEqual(pipelines);
    });
  });

  describe("getById", () => {
    it("returns pipeline when found", async () => {
      const pipeline = { id: "p1", name: "Sales" };
      mockFindById.mockResolvedValue(pipeline);

      const result = await pipelineService.getById(tenantId, "p1");

      expect(result).toEqual(pipeline);
    });

    it("throws 404 when pipeline not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        pipelineService.getById(tenantId, "missing"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Pipeline not found",
      });
    });
  });

  describe("update", () => {
    it("updates pipeline when found", async () => {
      const existing = { id: "p1" };
      const updated = { id: "p1", name: "Sales Updated" };
      mockFindById.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(updated);

      const result = await pipelineService.update(tenantId, "p1", {
        name: "Sales Updated",
      });

      expect(result).toEqual(updated);
    });

    it("throws 404 when pipeline not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        pipelineService.update(tenantId, "missing", { name: "x" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Pipeline not found",
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes pipeline when no deals", async () => {
      mockFindById.mockResolvedValue({ id: "p1" });
      mockCountDealsInPipeline.mockResolvedValue(0);

      await pipelineService.delete(tenantId, "p1", { userId: "u1" });

      expect(mockSoftDelete).toHaveBeenCalledWith("p1", {
        deletedBy: "u1",
        deleteReason: null,
      });
    });

    it("throws 404 when pipeline not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        pipelineService.delete(tenantId, "missing", { userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Pipeline not found",
      });

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });

    it("throws 400 when pipeline has deals", async () => {
      mockFindById.mockResolvedValue({ id: "p1" });
      mockCountDealsInPipeline.mockResolvedValue(5);

      await expect(
        pipelineService.delete(tenantId, "p1", { userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining(
          "Cannot delete pipeline with existing deals",
        ),
      });

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });
});
