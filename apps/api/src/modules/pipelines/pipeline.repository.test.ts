/**
 * Unit tests for PipelineRepository — create, findById, getDefaultStages.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    pipeline: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import pipelineRepository from "./pipeline.repository";

describe("PipelineRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("create", () => {
    it("calls prisma.pipeline.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "p1",
        name: "Sales",
        tenantId: "t1",
      });

      await pipelineRepository.create({
        tenantId: "t1",
        name: "Sales",
        stages: [{ id: "s1", name: "Lead", order: 0, probability: 10 }],
        isDefault: false,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          name: "Sales",
          type: "GENERAL",
          stages: expect.any(Array),
          isDefault: false,
        },
      });
    });
  });

  describe("findById", () => {
    it("queries with tenantId and id", async () => {
      mockFindFirst.mockResolvedValue({ id: "p1", name: "Sales" });

      const result = await pipelineRepository.findById("t1", "p1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: "p1", tenantId: "t1" },
        include: expect.any(Object),
      });
      expect(result?.id).toBe("p1");
    });
  });

  describe("getDefaultStages", () => {
    it("returns default stages", () => {
      const stages = pipelineRepository.getDefaultStages();

      expect(stages).toHaveLength(5);
      expect(stages[0]).toMatchObject({ name: "Qualification", order: 1 });
    });
  });

  describe("seedFrameworkPipelines", () => {
    it("creates 3 pipelines for the tenant", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCreate.mockResolvedValue({
        id: "p1",
        name: "New Sales",
        type: "NEW_SALES",
      });

      await pipelineRepository.seedFrameworkPipelines("tenant-1");

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-1",
            name: "New Sales",
            isDefault: true,
          }),
        }),
      );
      expect(mockCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-1",
            name: "Remarketing",
            isDefault: false,
          }),
        }),
      );
      expect(mockCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-1",
            name: "Repurchase",
            isDefault: false,
          }),
        }),
      );
    });
  });
});
