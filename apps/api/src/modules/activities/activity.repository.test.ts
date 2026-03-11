/**
 * Unit tests for ActivityRepository — query construction and tenant scoping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst, mockFindMany, mockUpdate } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdate: vi.fn(),
  }),
);

vi.mock("@/config/prisma", () => ({
  default: {
    activity: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import activityRepository from "./activity.repository";

describe("ActivityRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("calls prisma.activity.create with correct data", async () => {
      const data = {
        tenantId: "t1",
        type: "CALL" as const,
        subject: "Follow-up",
        notes: null,
        activityAt: new Date("2024-01-15"),
        contactId: "c1",
        memberId: null,
        dealId: null,
        createdById: "u1",
      };
      mockCreate.mockResolvedValue({ id: "a1", ...data });

      await activityRepository.create(data);

      expect(mockCreate).toHaveBeenCalledWith({
        data,
        include: expect.any(Object),
      });
    });
  });

  describe("findByContact", () => {
    it("queries with tenantId and contactId", async () => {
      mockFindMany.mockResolvedValue([]);

      await activityRepository.findByContact("t1", "c1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { tenantId: "t1", contactId: "c1" },
        orderBy: { activityAt: "desc" },
        include: expect.any(Object),
      });
    });
  });

  describe("findByDeal", () => {
    it("queries with tenantId and dealId", async () => {
      mockFindMany.mockResolvedValue([]);

      await activityRepository.findByDeal("t1", "d1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { tenantId: "t1", dealId: "d1" },
        orderBy: { activityAt: "desc" },
        include: expect.any(Object),
      });
    });
  });

  describe("findById", () => {
    it("queries with id and tenantId", async () => {
      mockFindFirst.mockResolvedValue({ id: "a1", type: "CALL" });

      const result = await activityRepository.findById("t1", "a1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: "a1", tenantId: "t1" },
        include: expect.any(Object),
      });
      expect(result?.id).toBe("a1");
    });

    it("returns null when not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await activityRepository.findById("t1", "missing");

      expect(result).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("calls prisma.activity.update with deletedAt and deletedBy", async () => {
      mockUpdate.mockResolvedValue({ id: "a1", deletedAt: new Date() });

      await activityRepository.softDelete("a1", {
        deletedBy: "u1",
        deleteReason: "Test",
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: expect.objectContaining({
          deletedBy: "u1",
          deleteReason: "Test",
        }),
      });
    });
  });
});
