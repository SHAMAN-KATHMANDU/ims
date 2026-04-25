import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "./audit.service";

const mockCount = vi.fn();
const mockFindMany = vi.fn();

const mockRepo = {
  count: mockCount,
  findMany: mockFindMany,
} as unknown as import("./audit.repository").AuditRepository;

const auditService = new AuditService(mockRepo);

describe("AuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuditLogs", () => {
    it("returns paginated audit logs with tenant filter", async () => {
      const logs = [
        {
          id: "log1",
          tenantId: "t1",
          userId: "u1",
          action: "CREATE_SALE",
          resource: "sale",
          resourceId: "s1",
          createdAt: new Date(),
        },
      ];
      mockCount.mockResolvedValue(1);
      mockFindMany.mockResolvedValue(logs);

      const result = await auditService.getAuditLogs("t1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(logs);
      expect(result.pagination.totalItems).toBe(1);
      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "t1" }),
      );
    });

    it("filters by userId when provided", async () => {
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      await auditService.getAuditLogs("t1", {
        page: 1,
        limit: 10,
        userId: "u1",
      });

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1" }),
      );
    });
  });
});
