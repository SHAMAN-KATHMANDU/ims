/**
 * Unit tests for TaskRepository — create, findById.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    task: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn(),
  createPaginationResult: vi.fn(),
  getPrismaOrderBy: vi.fn().mockReturnValue({ dueDate: "asc" }),
}));

import taskRepository from "./task.repository";

describe("TaskRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findById", () => {
    it("queries with tenantId and id", async () => {
      mockFindFirst.mockResolvedValue({ id: "t1", title: "Call" });

      const result = await taskRepository.findById("tenant1", "t1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "t1",
            tenantId: "tenant1",
          }),
        }),
      );
      expect(result?.id).toBe("t1");
    });
  });
});
