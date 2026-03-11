/**
 * Unit tests for AuditRepository — create, count, findMany.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockCount, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockCount: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import auditRepository from "./audit.repository";

describe("AuditRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("calls prisma.auditLog.create with correct data", async () => {
      const data = {
        tenantId: "t1",
        userId: "u1",
        action: "CREATE",
        resource: "Product",
        resourceId: "p1",
      };
      mockCreate.mockResolvedValue({ id: "log1", ...data });

      await auditRepository.create(data);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "t1",
          userId: "u1",
          action: "CREATE",
          resource: "Product",
          resourceId: "p1",
        }),
      });
    });
  });

  describe("count", () => {
    it("calls prisma.auditLog.count with where clause", async () => {
      mockCount.mockResolvedValue(42);

      const result = await auditRepository.count({
        tenantId: "t1",
        action: "CREATE",
      });

      expect(mockCount).toHaveBeenCalledWith({
        where: { tenantId: "t1", action: "CREATE" },
      });
      expect(result).toBe(42);
    });
  });

  describe("findMany", () => {
    it("calls prisma.auditLog.findMany with params", async () => {
      const logs = [{ id: "log1", action: "CREATE" }];
      mockFindMany.mockResolvedValue(logs);

      const result = await auditRepository.findMany({
        where: { tenantId: "t1" },
        skip: 0,
        take: 20,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { tenantId: "t1" },
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
        include: expect.objectContaining({
          user: expect.any(Object),
        }),
      });
      expect(result).toEqual(logs);
    });
  });
});
