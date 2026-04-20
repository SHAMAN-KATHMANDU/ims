import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAggregate = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockGroupBy = vi.fn();
const mockActivityFindMany = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    deal: {
      aggregate: (...a: unknown[]) => mockAggregate(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
    },
    task: { count: vi.fn().mockResolvedValue(0) },
    lead: { groupBy: vi.fn().mockResolvedValue([]) },
    activity: { findMany: (...a: unknown[]) => mockActivityFindMany(...a) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import crmRepository from "./crm.repository";

describe("CrmRepository", () => {
  const tenantId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAggregate.mockResolvedValue({ _sum: { value: 0 } });
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);
    mockActivityFindMany.mockResolvedValue([]);
  });

  describe("getDashboardData", () => {
    it("filters open deal aggregate by isLatest, deletedAt", async () => {
      await crmRepository.getDashboardData(tenantId);

      expect(mockAggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            deletedAt: null,
            isLatest: true,
            status: "OPEN",
          }),
        }),
      );
    });

    it("filters won deals for revenue chart by isLatest, deletedAt", async () => {
      await crmRepository.getDashboardData(tenantId);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            deletedAt: null,
            isLatest: true,
            status: "WON",
          }),
        }),
      );
    });

    it("projects recentActivities with select (drops notes/audit columns)", async () => {
      await crmRepository.getDashboardData(tenantId);

      expect(mockActivityFindMany).toHaveBeenCalledTimes(1);
      const arg = mockActivityFindMany.mock.calls[0][0];
      expect(arg.select).toEqual({
        id: true,
        type: true,
        subject: true,
        activityAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true } },
      });
      expect(arg.include).toBeUndefined();
      expect(arg.select.notes).toBeUndefined();
      expect(arg.select.deleteReason).toBeUndefined();
    });
  });

  describe("getReportsData", () => {
    it("filters deal counts and groupBy by isLatest, deletedAt", async () => {
      const prisma = (await import("@/config/prisma")).default;
      vi.mocked(prisma.lead.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      mockGroupBy.mockResolvedValue([]);

      await crmRepository.getReportsData(tenantId, 2024);

      const dealCountCalls = mockCount.mock.calls.map((c) => c[0]?.where);
      for (const w of dealCountCalls) {
        expect(w).toMatchObject({
          tenantId,
          deletedAt: null,
          isLatest: true,
        });
      }

      expect(mockGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            deletedAt: null,
            isLatest: true,
            status: "WON",
          }),
        }),
      );

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            deletedAt: null,
            isLatest: true,
            status: "WON",
          }),
        }),
      );
    });
  });
});
